import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P06_LIVE_TEST_PROJECT_REF;
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P06 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [];
const workspaces = [];
const paths = [];

async function actor(label) {
  const email = `p06-${label}-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = 'Test!' + randomBytes(24).toString('base64url');
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(created.error);
  users.push(created.data.user.id);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (await client.auth.signInWithPassword({ email, password })).error,
  );
  const workspace = await client.rpc('create_workspace', {
    p_name: `P06 ${label}`,
    p_slug: `p06-${label}-${randomUUID().slice(0, 8)}`,
    p_timezone: 'UTC',
  });
  assert.ifError(workspace.error);
  workspaces.push(workspace.data);
  assert.ifError(
    (
      await service
        .from('workspaces')
        .update({
          company_name: `P06 ${label}`,
          support_name: `P06 ${label} care`,
          support_email: `${label}@example.invalid`,
          onboarding_step: 'complete',
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', workspace.data)
    ).error,
  );
  return { client, workspaceId: workspace.data };
}

async function waitFor(sourceId, terminal = 'ready') {
  for (let i = 0; i < 60; i++) {
    const result = await service
      .from('knowledge_sources')
      .select(
        'status,error_code,error_message,content_hash,document_count,chunk_count',
      )
      .eq('id', sourceId)
      .single();
    assert.ifError(result.error);
    if (result.data.status === terminal) return result.data;
    if (['ready', 'failed'].includes(result.data.status))
      throw new Error(
        `Source ${sourceId} ended ${result.data.status}: ${result.data.error_code}`,
      );
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for source ${sourceId}`);
}

function pdfWithText(text) {
  const stream = `BT /F1 18 Tf 40 200 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 300] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];
  let output = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(output));
    output += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const start = Buffer.byteLength(output);
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1))
    output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(output);
}

async function fileSource(actor, type, bytes) {
  const created = await actor.client.rpc('create_knowledge_source', {
    p_workspace_id: actor.workspaceId,
    p_name: `P06 ${type} ${randomUUID().slice(0, 6)}`,
    p_type: type,
  });
  assert.ifError(created.error);
  const path = `workspace/${actor.workspaceId}/knowledge/${created.data}/original`;
  paths.push(path);
  const uploaded = await actor.client.storage
    .from('knowledge-private')
    .upload(path, bytes, {
      contentType: type === 'pdf' ? 'application/pdf' : 'text/plain',
    });
  assert.ifError(uploaded.error);
  assert.ifError(
    (
      await actor.client.rpc('enqueue_knowledge_upload', {
        p_workspace_id: actor.workspaceId,
        p_source_id: created.data,
      })
    ).error,
  );
  return { id: created.data, path };
}

try {
  const owner = await actor('owner');
  const outsider = await actor('outsider');
  const pasted = await owner.client.rpc('create_knowledge_source', {
    p_workspace_id: owner.workspaceId,
    p_name: 'P06 paste',
    p_type: 'paste',
    p_text: '# Returns\nCustomers can request a refund within 30 days.',
  });
  assert.ifError(pasted.error);
  const ready = await waitFor(pasted.data);
  assert.equal(ready.status, 'ready');
  assert(ready.chunk_count > 0 && ready.content_hash);
  const foreign = await outsider.client
    .from('knowledge_sources')
    .select('id')
    .eq('id', pasted.data);
  assert.ifError(foreign.error);
  assert.equal(foreign.data.length, 0);
  const foreignSearch = await outsider.client.rpc('search_knowledge_chunks', {
    p_workspace_id: owner.workspaceId,
    p_embedding: Array(384).fill(0),
    p_limit: 5,
  });
  assert(foreignSearch.error);
  const before = await service
    .from('knowledge_chunks')
    .select('id')
    .eq('source_id', pasted.data);
  assert.ifError(before.error);
  assert.ifError(
    (
      await owner.client.rpc('reindex_knowledge_source', {
        p_workspace_id: owner.workspaceId,
        p_source_id: pasted.data,
      })
    ).error,
  );
  await waitFor(pasted.data);
  const after = await service
    .from('knowledge_chunks')
    .select('id')
    .eq('source_id', pasted.data);
  assert.ifError(after.error);
  assert.deepEqual(
    after.data.map((item) => item.id),
    before.data.map((item) => item.id),
  );

  const reserved = await owner.client.rpc('create_knowledge_source', {
    p_workspace_id: owner.workspaceId,
    p_name: 'P06 reserved',
    p_type: 'txt',
  });
  assert.ifError(reserved.error);
  const reservedPath = `workspace/${owner.workspaceId}/knowledge/${reserved.data}/original`;
  paths.push(reservedPath);
  const attack = await outsider.client.storage
    .from('knowledge-private')
    .upload(reservedPath, Buffer.from('stolen'), { contentType: 'text/plain' });
  assert(
    attack.error,
    'Outsider must not write another workspace storage path',
  );
  const oversized = await owner.client.storage
    .from('knowledge-private')
    .upload(reservedPath, Buffer.alloc(5_242_881, 65), {
      contentType: 'text/plain',
    });
  assert(oversized.error, 'Storage bucket must reject oversized files');

  const abandonedAt = new Date(Date.now() - 11 * 60_000).toISOString();
  assert.ifError(
    (
      await service
        .from('knowledge_sources')
        .update({ created_at: abandonedAt })
        .eq('id', reserved.data)
    ).error,
  );
  const missingRecovery = await service.rpc(
    'recover_abandoned_knowledge_uploads',
  );
  assert.ifError(missingRecovery.error);
  assert.equal(missingRecovery.data, 1);
  const incomplete = await waitFor(reserved.data, 'failed');
  assert.equal(incomplete.error_code, 'UPLOAD_INCOMPLETE');

  const stranded = await owner.client.rpc('create_knowledge_source', {
    p_workspace_id: owner.workspaceId,
    p_name: 'P06 uploaded but not queued',
    p_type: 'txt',
  });
  assert.ifError(stranded.error);
  const strandedPath = `workspace/${owner.workspaceId}/knowledge/${stranded.data}/original`;
  paths.push(strandedPath);
  assert.ifError(
    (
      await owner.client.storage
        .from('knowledge-private')
        .upload(
          strandedPath,
          Buffer.from('Recovered uploaded knowledge content.'),
          {
            contentType: 'text/plain',
          },
        )
    ).error,
  );
  assert.ifError(
    (
      await service
        .from('knowledge_sources')
        .update({ created_at: abandonedAt })
        .eq('id', stranded.data)
    ).error,
  );
  const uploadedRecovery = await service.rpc(
    'recover_abandoned_knowledge_uploads',
  );
  assert.ifError(uploadedRecovery.error);
  assert.equal(uploadedRecovery.data, 1);
  const recovered = await waitFor(stranded.data);
  assert(recovered.chunk_count > 0);

  const pdf = await fileSource(
    owner,
    'pdf',
    pdfWithText('SupportSphere PDF indexing proof.'),
  );
  const pdfReady = await waitFor(pdf.id);
  assert.equal(pdfReady.document_count, 1);
  assert(pdfReady.chunk_count > 0);
  await outsider.client.storage.from('knowledge-private').remove([pdf.path]);
  const protectedFile = await owner.client.storage
    .from('knowledge-private')
    .download(pdf.path);
  assert.ifError(protectedFile.error);
  assert(protectedFile.data, 'Foreign workspace must not delete the PDF');
  const pdfDoc = await service
    .from('knowledge_documents')
    .select('content')
    .eq('source_id', pdf.id)
    .single();
  assert.ifError(pdfDoc.error);
  assert(pdfDoc.data.content.includes('SupportSphere PDF indexing proof'));
  const broken = await fileSource(owner, 'pdf', Buffer.from('%PDF-broken'));
  const failed = await waitFor(broken.id, 'failed');
  assert.equal(failed.error_code, 'INVALID_PDF');
  assert.equal(failed.chunk_count, 0);

  const retry = await owner.client.rpc('create_knowledge_source', {
    p_workspace_id: owner.workspaceId,
    p_name: 'P06 transient retry',
    p_type: 'paste',
    p_text:
      'A short source to prove bounded transient retry after an embedding outage.',
  });
  assert.ifError(retry.error);
  const claimed = await service.rpc('claim_ingestion_job');
  assert.ifError(claimed.error);
  assert.equal(claimed.data.source_id, retry.data);
  assert.ifError(
    (
      await service.rpc('fail_ingestion_job', {
        p_job_id: claimed.data.job_id,
        p_lease_token: claimed.data.lease_token,
        p_code: 'EMBEDDING_UNAVAILABLE',
        p_message:
          'Indexing is temporarily unavailable. We will retry automatically.',
        p_retry: true,
      })
    ).error,
  );
  const retried = await waitFor(retry.data);
  assert.equal(retried.status, 'ready');
  const attempts = await service
    .from('ingestion_jobs')
    .select('attempt,status')
    .eq('source_id', retry.data)
    .single();
  assert.ifError(attempts.error);
  assert.equal(attempts.data.attempt, 2);
  assert.equal(attempts.data.status, 'succeeded');
  console.log('P06 live knowledge proof passed');
} finally {
  if (paths.length)
    await service.storage.from('knowledge-private').remove(paths);
  if (workspaces.length) {
    assert.ifError(
      (await service.from('audit_logs').delete().in('workspace_id', workspaces))
        .error,
    );
    assert.ifError(
      (
        await service
          .from('workspace_members')
          .delete()
          .in('workspace_id', workspaces)
      ).error,
    );
    assert.ifError(
      (await service.from('workspaces').delete().in('id', workspaces)).error,
    );
  }
  for (const userId of users) await service.auth.admin.deleteUser(userId);
}
