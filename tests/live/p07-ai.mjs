import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P07_LIVE_TEST_PROJECT_REF;
assert(
  url && publishable && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P07 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const users = [],
  workspaces = [];
function ok(result, label) {
  assert.ifError(result.error, label);
  return result.data;
}
async function actor(label) {
  const email = `p07-${label}-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = 'Test!' + randomBytes(24).toString('base64url');
  const created = ok(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
    'create user',
  );
  users.push(created.user.id);
  const client = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok(await client.auth.signInWithPassword({ email, password }), 'sign in');
  const workspaceId = ok(
    await client.rpc('create_workspace', {
      p_name: `P07 ${label}`,
      p_slug: `p07-${label}-${randomUUID().slice(0, 8)}`,
      p_timezone: 'UTC',
    }),
    'workspace',
  );
  workspaces.push(workspaceId);
  return { client, workspaceId, userId: created.user.id };
}
async function setMode(actor, mode) {
  ok(
    await actor.client.rpc('update_ai_config', {
      p_workspace_id: actor.workspaceId,
      p_mode: mode,
      p_tone: 'clear and helpful',
      p_confidence: 0.85,
      p_evidence: 0.75,
      p_custom_instructions: '',
      p_excluded_intents: [
        'billing',
        'security',
        'privacy',
        'legal',
        'account_change',
      ],
    }),
    'set AI mode',
  );
}
async function sendCustomer(workspaceId, conversationId, body) {
  const message = ok(
    await service
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        sender_type: 'customer',
        body,
      })
      .select('id')
      .single(),
    'customer message',
  );
  const runs = ok(
    await service
      .from('ai_runs')
      .select('id,status,policy_version')
      .eq('input_message_id', message.id),
    'run lookup',
  );
  return { message, runs };
}
async function claim(expectedId) {
  const job = ok(await service.rpc('claim_ai_run'), 'claim AI run');
  assert(job && job.id === expectedId, 'Expected newly queued run');
  return job;
}
const triage = {
  intent: 'how_to',
  priority: 'normal',
  sentiment: 'neutral',
  language: 'en',
  escalate: false,
  confidence: 0.95,
  summary: 'How to export',
  tags: [],
};
const quality = {
  passed: true,
  grounded: true,
  safe: true,
  tone_ok: true,
  reason: 'Grounded',
  confidence: 0.94,
};
function result(job, citation, overrides = {}) {
  return {
    p_run_id: job.id,
    p_lease_token: job.lease_token,
    p_provider: 'controlled-test',
    p_model: 'test-only',
    p_triage: triage,
    p_quality: quality,
    p_output: 'Open Settings and choose Export [1].',
    p_confidence: 0.94,
    p_evidence: 0.98,
    p_requested_decision: 'auto_sent',
    p_reason: 'GATES_PASSED',
    p_steps: [
      {
        type: 'triage',
        status: 'passed',
        duration_ms: 2,
        metadata: { intent: 'how_to' },
      },
      {
        type: 'retrieve',
        status: 'passed',
        duration_ms: 3,
        metadata: { matches: 1 },
      },
      {
        type: 'quality',
        status: 'passed',
        duration_ms: 2,
        metadata: { safe: true },
      },
    ],
    p_citations: [
      {
        source_id: citation.sourceId,
        chunk_id: citation.chunkId,
        ordinal: 1,
        score: 0.98,
        snippet: 'Open Settings and choose Export.',
      },
    ],
    p_input_tokens: 50,
    p_output_tokens: 20,
    p_latency_ms: 12,
    ...overrides,
  };
}
try {
  const owner = await actor('owner');
  const outsider = await actor('outsider');
  const customerId = ok(
    await owner.client.rpc('create_or_get_customer', {
      p_workspace_id: owner.workspaceId,
      p_name: 'Test customer',
      p_email: 'test@example.invalid',
      p_phone: '',
      p_company: '',
      p_provider: 'manual',
      p_identity_key: '',
    }),
    'customer',
  );
  const conversationId = ok(
    await owner.client.rpc('create_conversation', {
      p_workspace_id: owner.workspaceId,
      p_customer_id: customerId,
      p_subject: 'P07 controlled suite',
      p_channel: 'manual',
    }),
    'conversation',
  );
  const source = ok(
    await service
      .from('knowledge_sources')
      .insert({
        workspace_id: owner.workspaceId,
        name: 'Export guide',
        source_type: 'paste',
        input_text: 'Open Settings and choose Export.',
        status: 'ready',
        document_count: 1,
        chunk_count: 1,
      })
      .select('id')
      .single(),
    'source',
  );
  const document = ok(
    await service
      .from('knowledge_documents')
      .insert({
        workspace_id: owner.workspaceId,
        source_id: source.id,
        document_index: 0,
        title: 'Export guide',
        content: 'Open Settings and choose Export.',
      })
      .select('id')
      .single(),
    'document',
  );
  const vector = '[' + [1, ...Array(383).fill(0)].join(',') + ']';
  const chunk = ok(
    await service
      .from('knowledge_chunks')
      .insert({
        workspace_id: owner.workspaceId,
        source_id: source.id,
        document_id: document.id,
        chunk_index: 0,
        content: 'Open Settings and choose Export.',
        token_count: 8,
        embedding: vector,
      })
      .select('id')
      .single(),
    'chunk',
  );
  const citation = { sourceId: source.id, chunkId: chunk.id };
  const search = ok(
    await service.rpc('search_ai_knowledge', {
      p_workspace_id: owner.workspaceId,
      p_embedding: vector,
      p_limit: 5,
    }),
    'workspace retrieval',
  );
  assert.equal(search[0].chunk_id, chunk.id);
  const foreignSearch = ok(
    await service.rpc('search_ai_knowledge', {
      p_workspace_id: outsider.workspaceId,
      p_embedding: vector,
      p_limit: 5,
    }),
    'foreign retrieval',
  );
  assert.equal(foreignSearch.length, 0);

  const off = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'How do I export?',
  );
  assert.equal(off.runs.length, 0, 'Off mode enqueues nothing');
  await setMode(owner, 'draft_only');
  const draft = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'How do I export now?',
  );
  assert.equal(draft.runs.length, 1);
  const foreign = ok(
    await outsider.client
      .from('ai_runs')
      .select('id')
      .eq('id', draft.runs[0].id),
    'foreign read',
  );
  assert.equal(foreign.length, 0);
  const denied = await outsider.client.rpc('update_ai_config', {
    p_workspace_id: owner.workspaceId,
    p_mode: 'assisted',
    p_tone: 'clear and helpful',
    p_confidence: 0.85,
    p_evidence: 0.75,
    p_custom_instructions: '',
    p_excluded_intents: [],
  });
  assert(denied.error, 'Foreign policy mutation denied');
  const draftJob = await claim(draft.runs[0].id);
  const draftDecision = ok(
    await service.rpc('finish_ai_run', result(draftJob, citation)),
    'finish draft',
  );
  assert.equal(draftDecision, 'draft', 'Draft mode cannot auto-send');
  const draftRun = ok(
    await owner.client
      .from('ai_runs')
      .select('decision,output_text')
      .eq('id', draftJob.id)
      .single(),
    'draft inspector',
  );
  assert.equal(draftRun.decision, 'draft');
  assert.equal(
    ok(
      await owner.client
        .from('ai_citations')
        .select('id')
        .eq('run_id', draftJob.id),
      'citations',
    ).length,
    1,
  );
  assert.equal(
    ok(
      await owner.client
        .from('ai_run_steps')
        .select('id')
        .eq('run_id', draftJob.id),
      'steps',
    ).length,
    3,
  );
  assert.equal(
    ok(
      await service
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'agent'),
      'agent messages',
    ).length,
    0,
  );
  ok(
    await owner.client.rpc('submit_ai_feedback', {
      p_workspace_id: owner.workspaceId,
      p_run_id: draftJob.id,
      p_rating: 'helpful',
      p_reason: 'grounded',
      p_comment: 'Useful draft',
    }),
    'feedback',
  );
  assert.equal(
    ok(
      await owner.client
        .from('ai_feedback')
        .select('id')
        .eq('run_id', draftJob.id),
      'feedback read',
    ).length,
    1,
  );

  await setMode(owner, 'assisted');
  const qualityFail = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'Can I export a report?',
  );
  const qualityJob = await claim(qualityFail.runs[0].id);
  assert.equal(
    ok(
      await service.rpc(
        'finish_ai_run',
        result(qualityJob, citation, {
          p_quality: { ...quality, passed: false },
        }),
      ),
      'quality fail',
    ),
    'draft',
  );
  const good = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'Where is Export?',
  );
  const goodJob = await claim(good.runs[0].id);
  assert.equal(
    ok(
      await service.rpc('finish_ai_run', result(goodJob, citation)),
      'auto reply',
    ),
    'auto_sent',
  );
  assert.equal(
    ok(
      await service
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'agent'),
      'sent messages',
    ).length,
    1,
  );
  const noEvidence = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'Unknown policy question',
  );
  const noEvidenceJob = await claim(noEvidence.runs[0].id);
  assert.equal(
    ok(
      await service.rpc(
        'finish_ai_run',
        result(noEvidenceJob, citation, {
          p_requested_decision: 'escalated',
          p_reason: 'NO_RELIABLE_EVIDENCE',
          p_output: '',
          p_evidence: 0,
          p_citations: [],
          p_quality: null,
        }),
      ),
      'no evidence',
    ),
    'escalated',
  );
  const handoff = ok(
    await service
      .from('conversations')
      .select('ai_handoff_at,ai_handoff_reason')
      .eq('id', conversationId)
      .single(),
    'handoff',
  );
  assert(
    handoff.ai_handoff_at &&
      handoff.ai_handoff_reason === 'NO_RELIABLE_EVIDENCE',
  );
  ok(
    await owner.client.rpc('release_ai_handoff', {
      p_workspace_id: owner.workspaceId,
      p_conversation_id: conversationId,
    }),
    'release handoff',
  );
  const outage = await sendCustomer(
    owner.workspaceId,
    conversationId,
    'Need an export help',
  );
  const outageJob = await claim(outage.runs[0].id);
  ok(
    await service.rpc('fail_ai_run', {
      p_run_id: outageJob.id,
      p_lease_token: outageJob.lease_token,
      p_error_code: 'PROVIDER_TIMEOUT',
      p_retry: false,
    }),
    'provider outage',
  );
  const failed = ok(
    await owner.client
      .from('ai_runs')
      .select('status,error_code,decision')
      .eq('id', outageJob.id)
      .single(),
    'failed run',
  );
  assert.deepEqual(
    {
      status: failed.status,
      error: failed.error_code,
      decision: failed.decision,
    },
    { status: 'failed', error: 'PROVIDER_TIMEOUT', decision: 'escalated' },
  );
  console.log(
    'P07 live database scenarios passed: off, tenant retrieval/RLS, draft, quality, auto-send, citations, feedback, no evidence, handoff, outage',
  );
} finally {
  for (const id of workspaces.reverse()) {
    for (const table of ['audit_logs', 'workspace_members'])
      assert.ifError(
        (await service.from(table).delete().eq('workspace_id', id)).error,
      );
    assert.ifError(
      (await service.from('workspaces').delete().eq('id', id)).error,
    );
  }
  for (const id of users.reverse())
    assert.ifError((await service.auth.admin.deleteUser(id)).error);
}
