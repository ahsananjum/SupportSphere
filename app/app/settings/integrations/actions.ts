'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { logEvent } from '../../../../lib/observability/log';
import { createWebhookSecret } from '../../../../lib/integrations/webhooks';
import { webhookEventTypes } from '../../../../lib/integrations/webhook-contract';
import type { FormState } from '../../../../lib/action-state';

const eventSchema = z.array(z.enum(webhookEventTypes)).min(1).max(5);
const urlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    return url.protocol === 'https:';
  }, 'Use an HTTPS URL.');

function text(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}
function eventValues(formData: FormData) {
  return eventSchema.safeParse(
    formData
      .getAll('eventTypes')
      .filter((value): value is string => typeof value === 'string'),
  );
}
function canManage(role: string) {
  return role === 'owner' || role === 'admin';
}

export async function createWebhookEndpoint(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      destinationUrl: urlSchema,
    })
    .safeParse({
      name: text(formData.get('name')),
      destinationUrl: text(formData.get('destinationUrl')),
    });
  const events = eventValues(formData);
  if (!parsed.success || !events.success)
    return {
      message: 'Add a name, HTTPS destination, and at least one event.',
      values: Object.fromEntries(formData.entries()) as Record<string, string>,
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canManage(active.role))
    return {
      message: 'Only workspace owners and admins can manage integrations.',
    };
  const secret = createWebhookSecret();
  const { error } = await supabase.rpc('create_webhook_endpoint', {
    p_workspace_id: active.id,
    p_name: parsed.data.name,
    p_destination_url: parsed.data.destinationUrl,
    p_secret: secret,
    p_event_types: events.data,
  });
  if (error) {
    logEvent('webhook.endpoint', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return {
      message:
        error.code === 'P0001'
          ? 'Check the endpoint URL, events, and your workspace role.'
          : 'The webhook endpoint could not be saved. Retry shortly.',
    };
  }
  revalidatePath('/app/settings/integrations');
  return {
    success:
      'Endpoint connected. Copy the signing secret now; it will not be shown again.',
    secret,
  };
}

export async function updateWebhookEndpoint(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.string().uuid().safeParse(formData.get('endpointId'));
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      destinationUrl: urlSchema,
      enabled: z.boolean(),
    })
    .safeParse({
      name: text(formData.get('name')),
      destinationUrl: text(formData.get('destinationUrl')),
      enabled: formData.get('enabled') === 'on',
    });
  const events = eventValues(formData);
  if (!id.success || !parsed.success || !events.success)
    return { message: 'Check the endpoint URL, name, and selected events.' };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canManage(active.role))
    return {
      message: 'Only workspace owners and admins can manage integrations.',
    };
  const { error } = await supabase.rpc('update_webhook_endpoint', {
    p_workspace_id: active.id,
    p_endpoint_id: id.data,
    p_name: parsed.data.name,
    p_destination_url: parsed.data.destinationUrl,
    p_event_types: events.data,
    p_enabled: parsed.data.enabled,
  });
  if (error) {
    logEvent('webhook.endpoint', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return { message: 'The endpoint could not be updated. Refresh and retry.' };
  }
  revalidatePath('/app/settings/integrations');
  return { success: 'Endpoint settings saved.' };
}

export async function deleteWebhookEndpoint(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get('endpointId'));
  if (!id.success) return;
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canManage(active.role)) return;
  await supabase.rpc('delete_webhook_endpoint', {
    p_workspace_id: active.id,
    p_endpoint_id: id.data,
  });
  revalidatePath('/app/settings/integrations');
}

export async function sendWebhookTest(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get('endpointId'));
  if (!id.success) return;
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canManage(active.role)) return;
  const { error } = await supabase.rpc('enqueue_webhook_test', {
    p_workspace_id: active.id,
    p_endpoint_id: id.data,
  });
  if (error)
    logEvent('webhook.test', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
  revalidatePath('/app/settings/integrations');
}

export async function rotateWebhookSecret(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.string().uuid().safeParse(formData.get('endpointId'));
  if (!id.success) return { message: 'That endpoint is no longer available.' };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !canManage(active.role))
    return {
      message: 'Only workspace owners and admins can manage integrations.',
    };
  const secret = createWebhookSecret();
  const { error } = await supabase.rpc('rotate_webhook_secret', {
    p_workspace_id: active.id,
    p_endpoint_id: id.data,
    p_secret: secret,
  });
  if (error) {
    logEvent('webhook.secret', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return {
      message: 'The signing secret could not be rotated. Retry shortly.',
    };
  }
  revalidatePath('/app/settings/integrations');
  return {
    success: 'Signing secret rotated. Copy the new secret now.',
    secret,
  };
}
