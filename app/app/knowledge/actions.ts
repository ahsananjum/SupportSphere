'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { logEvent } from '../../../lib/observability/log';
import type { FormState } from '../../../lib/action-state';

const nameSchema = z.string().trim().min(1).max(160);
const textSchema = z.string().trim().min(1).max(80_000);
const idSchema = z.uuid();
const maxBytes = 4_194_304;
const fileTypes = {
  '.txt': {
    type: 'txt',
    mimes: ['text/plain', 'application/octet-stream', ''],
  },
  '.md': {
    type: 'md',
    mimes: ['text/markdown', 'text/plain', 'application/octet-stream', ''],
  },
  '.pdf': {
    type: 'pdf',
    mimes: ['application/pdf', 'application/octet-stream', ''],
  },
} as const;

async function writableContext() {
  const context = await getWorkspaceContext();
  if (
    !context.active ||
    (!context.active.onboardingCompletedAt &&
      context.active.onboardingStep !== 'knowledge') ||
    !['owner', 'admin'].includes(context.active.role)
  )
    return null;
  return context;
}

export async function createTextSource(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get('name') ?? '');
  const content = String(formData.get('content') ?? '');
  const parsed = z
    .object({ name: nameSchema, content: textSchema })
    .safeParse({ name, content });
  if (!parsed.success)
    return {
      message: 'Add a name and up to 80,000 characters of text.',
      values: { name, content },
    };
  const context = await writableContext();
  if (!context)
    return { message: 'Only a workspace owner or admin can add knowledge.' };
  const { error } = await context.supabase.rpc('create_knowledge_source', {
    p_workspace_id: context.active!.id,
    p_name: parsed.data.name,
    p_type: 'paste',
    p_text: parsed.data.content,
  });
  if (error) {
    logEvent('knowledge.create', 'failed', {
      workspaceId: context.active!.id,
      errorClass: error.code,
    });
    return {
      message: error.message.includes('SOURCE_LIMIT')
        ? 'This workspace has reached its knowledge source limit. Delete unused sources or try again after an hour.'
        : error.message.includes('JOB_LIMIT')
          ? 'Too many indexing requests in this workspace. Try again after an hour.'
          : 'Could not queue this source. Retry in a moment.',
      values: { name, content },
    };
  }
  logEvent('knowledge.create', 'queued', { workspaceId: context.active!.id });
  return { success: 'Source queued. Indexing continues in the background.' };
}

export async function uploadKnowledgeSource(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim();
  const file = formData.get('file');
  if (
    !nameSchema.safeParse(name).success ||
    !(file instanceof File) ||
    !file.size ||
    file.size > maxBytes
  )
    return {
      message: 'Choose a named TXT, MD, or text PDF file under 4 MB.',
      values: { name },
    };
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] as
    keyof typeof fileTypes | undefined;
  const config = extension ? fileTypes[extension] : undefined;
  if (!config || !(config.mimes as readonly string[]).includes(file.type))
    return {
      message:
        'Use a TXT, MD, or PDF file. Check its extension and content type.',
      values: { name },
    };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (config.type === 'pdf') {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-')
      return {
        message: 'This is not a valid PDF. Export a text PDF and upload again.',
        values: { name },
      };
  } else {
    try {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (text.includes('\0')) throw new Error('binary');
    } catch {
      return {
        message: 'Save this file as UTF-8 plain text and upload again.',
        values: { name },
      };
    }
  }
  const context = await writableContext();
  if (!context)
    return { message: 'Only a workspace owner or admin can upload knowledge.' };
  const workspaceId = context.active!.id;
  const created = await context.supabase.rpc('create_knowledge_source', {
    p_workspace_id: workspaceId,
    p_name: name,
    p_type: config.type,
  });
  if (created.error || !created.data)
    return {
      message: created.error?.message.includes('SOURCE_LIMIT')
        ? 'This workspace has reached its knowledge source limit. Delete unused sources or try again after an hour.'
        : 'Could not reserve this upload. Retry in a moment.',
      values: { name },
    };
  const sourceId = created.data;
  const path = `workspace/${workspaceId}/knowledge/${sourceId}/original`;
  const uploaded = await context.supabase.storage
    .from('knowledge-private')
    .upload(path, bytes, {
      contentType:
        config.type === 'pdf'
          ? 'application/pdf'
          : config.type === 'md'
            ? 'text/markdown'
            : 'text/plain',
      upsert: false,
    });
  if (uploaded.error) {
    await context.supabase.rpc('delete_knowledge_source', {
      p_workspace_id: workspaceId,
      p_source_id: sourceId,
    });
    logEvent('knowledge.upload', 'failed', {
      workspaceId,
      sourceId,
      errorClass: uploaded.error.name,
    });
    return {
      message: 'Upload failed. Check the file type and size, then retry.',
      values: { name },
    };
  }
  const enqueued = await context.supabase.rpc('enqueue_knowledge_upload', {
    p_workspace_id: workspaceId,
    p_source_id: sourceId,
  });
  if (enqueued.error) {
    await context.supabase.storage.from('knowledge-private').remove([path]);
    await context.supabase.rpc('delete_knowledge_source', {
      p_workspace_id: workspaceId,
      p_source_id: sourceId,
    });
    logEvent('knowledge.enqueue', 'failed', {
      workspaceId,
      sourceId,
      errorClass: enqueued.error.code,
    });
    return {
      message: enqueued.error.message.includes('JOB_LIMIT')
        ? 'Too many indexing requests in this workspace. Try again after an hour.'
        : 'The file uploaded, but indexing could not start. Retry the upload.',
      values: { name },
    };
  }
  logEvent('knowledge.upload', 'queued', { workspaceId, sourceId });
  return { success: 'File uploaded. Indexing continues in the background.' };
}

export async function changeKnowledgeSource(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const sourceId = String(formData.get('sourceId') ?? '');
  const operation = String(formData.get('operation') ?? '');
  if (
    !idSchema.safeParse(sourceId).success ||
    !['retry', 'reindex', 'enable', 'disable', 'delete'].includes(operation)
  )
    return { message: 'Invalid source action. Refresh and try again.' };
  const context = await writableContext();
  if (!context)
    return { message: 'Only a workspace owner or admin can change knowledge.' };
  const workspaceId = context.active!.id;
  const source = await context.supabase
    .from('knowledge_sources')
    .select('id,storage_path,status')
    .eq('workspace_id', workspaceId)
    .eq('id', sourceId)
    .maybeSingle();
  if (source.error || !source.data)
    return { message: 'Source not found in this workspace.' };
  let error: { code?: string; message?: string } | null = null;
  if (operation === 'delete') {
    if (source.data.storage_path) {
      const removed = await context.supabase.storage
        .from('knowledge-private')
        .remove([source.data.storage_path]);
      if (removed.error) {
        logEvent('knowledge.delete', 'storage_failed', {
          workspaceId,
          sourceId,
          errorClass: removed.error.name,
        });
        return { message: 'Could not remove the stored file. Retry deletion.' };
      }
    }
    const result = await context.supabase.rpc('delete_knowledge_source', {
      p_workspace_id: workspaceId,
      p_source_id: sourceId,
    });
    error = result.error;
  } else if (operation === 'enable' || operation === 'disable') {
    const result = await context.supabase.rpc('set_knowledge_source_enabled', {
      p_workspace_id: workspaceId,
      p_source_id: sourceId,
      p_enabled: operation === 'enable',
    });
    error = result.error;
  } else {
    const result = await context.supabase.rpc('reindex_knowledge_source', {
      p_workspace_id: workspaceId,
      p_source_id: sourceId,
    });
    error = result.error;
  }
  if (error) {
    logEvent('knowledge.change', 'failed', {
      workspaceId,
      sourceId,
      errorClass: error.code ?? 'unknown',
    });
    return {
      message: error.message?.includes('JOB_LIMIT')
        ? 'Too many indexing requests in this workspace. Try again after an hour.'
        : 'Could not change this source. Refresh and retry.',
    };
  }
  logEvent('knowledge.change', 'succeeded', { workspaceId, sourceId });
  if (operation === 'delete') redirect('/app/knowledge');
  return {
    success: 'Source updated.',
  };
}
