import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P07_LIVE_TEST_PROJECT_REF;
const app = process.env.P07_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P07 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `p07-ui-${randomUUID().slice(0, 8)}@example.invalid`;
const password = 'Test!' + randomBytes(24).toString('base64url');
let userId, workspaceId, browser;
function ok(result, label) {
  assert.ifError(result.error, label);
  return result.data;
}
try {
  userId = ok(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
    'create user',
  ).user.id;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok(await client.auth.signInWithPassword({ email, password }), 'sign in');
  workspaceId = ok(
    await client.rpc('create_workspace', {
      p_name: 'P07 UI',
      p_slug: `p07-ui-${randomUUID().slice(0, 8)}`,
      p_timezone: 'UTC',
    }),
    'workspace',
  );
  ok(
    await service
      .from('workspaces')
      .update({
        company_name: 'P07 UI',
        support_name: 'P07 UI care',
        support_email: email,
        onboarding_step: 'complete',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', workspaceId),
    'onboarding',
  );

  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${app}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue With Email' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/app$/);
  await page.goto(`${app}/app/settings/ai`);
  await page.getByRole('heading', { name: 'AI policy' }).waitFor();
  await page.getByRole('button', { name: 'Open workspace menu' }).click();
  await page.getByRole('dialog', { name: 'Workspace menu' }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(
    await page
      .getByRole('button', { name: 'Open workspace menu' })
      .evaluate((el) => document.activeElement === el),
    true,
  );
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `AI settings overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('Draft only').check();
  await page.getByRole('button', { name: 'Save AI policy' }).click();
  await page.getByText('AI policy saved.').waitFor();
  const config = ok(
    await service
      .from('ai_agent_configs')
      .select('mode')
      .eq('workspace_id', workspaceId)
      .single(),
    'config',
  );
  assert.equal(config.mode, 'draft_only');

  const customerId = ok(
    await client.rpc('create_or_get_customer', {
      p_workspace_id: workspaceId,
      p_name: 'UI Customer',
      p_email: 'ui@example.invalid',
      p_phone: '',
      p_company: '',
      p_provider: 'manual',
      p_identity_key: '',
    }),
    'customer',
  );
  const conversationId = ok(
    await client.rpc('create_conversation', {
      p_workspace_id: workspaceId,
      p_customer_id: customerId,
      p_subject: 'Export help',
      p_channel: 'manual',
    }),
    'conversation',
  );
  const source = ok(
    await service
      .from('knowledge_sources')
      .insert({
        workspace_id: workspaceId,
        name: 'UI Export guide',
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
  const doc = ok(
    await service
      .from('knowledge_documents')
      .insert({
        workspace_id: workspaceId,
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
        workspace_id: workspaceId,
        source_id: source.id,
        document_id: doc.id,
        chunk_index: 0,
        content: 'Open Settings and choose Export.',
        token_count: 8,
        embedding: vector,
      })
      .select('id')
      .single(),
    'chunk',
  );
  const message = ok(
    await service
      .from('messages')
      .insert({
        workspace_id: workspaceId,
        conversation_id: conversationId,
        sender_type: 'customer',
        body: 'How do I export?',
      })
      .select('id')
      .single(),
    'message',
  );
  const queued = ok(
    await service
      .from('ai_runs')
      .select('id')
      .eq('input_message_id', message.id)
      .single(),
    'queued run',
  );
  const job = ok(await service.rpc('claim_ai_run'), 'claim');
  assert.equal(job.id, queued.id);
  const decision = ok(
    await service.rpc('finish_ai_run', {
      p_run_id: job.id,
      p_lease_token: job.lease_token,
      p_provider: 'controlled-test',
      p_model: 'test-only',
      p_triage: {
        intent: 'how_to',
        priority: 'normal',
        sentiment: 'neutral',
        language: 'en',
        escalate: false,
        confidence: 0.95,
        summary: 'Export help',
        tags: [],
      },
      p_quality: {
        passed: true,
        grounded: true,
        safe: true,
        tone_ok: true,
        reason: 'Grounded',
        confidence: 0.94,
      },
      p_output: 'Open Settings and choose Export [1].',
      p_confidence: 0.94,
      p_evidence: 0.98,
      p_requested_decision: 'draft',
      p_reason: 'DRAFT_POLICY',
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
          source_id: source.id,
          chunk_id: chunk.id,
          ordinal: 1,
          score: 0.98,
          snippet: 'Open Settings and choose Export.',
        },
      ],
      p_input_tokens: 50,
      p_output_tokens: 20,
      p_latency_ms: 12,
    }),
    'finish draft',
  );
  assert.equal(decision, 'draft');

  await page.goto(`${app}/app/inbox/${conversationId}`);
  await page.getByRole('heading', { name: 'Draft for human review' }).waitFor();
  assert.equal(
    await page.getByLabel('Reply').inputValue(),
    'Open Settings and choose Export [1].',
  );
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Conversation overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await mkdir('test-results', { recursive: true });
  await page.waitForTimeout(350);
  assert.equal(
    await page
      .locator('#workspace-menu')
      .evaluate((el) => getComputedStyle(el).visibility),
    'hidden',
  );
  await page.screenshot({
    path: 'test-results/p07-conversation-mobile.png',
    fullPage: true,
  });
  await page.getByRole('link', { name: 'Inspect run and citations' }).click();
  await page.getByRole('heading', { name: 'Evidence and citations' }).waitFor();
  await page
    .getByText('Open Settings and choose Export.', { exact: true })
    .first()
    .waitFor();
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Run inspector overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  assert.equal(
    await page
      .locator('#workspace-menu')
      .evaluate((el) => getComputedStyle(el).visibility),
    'hidden',
  );
  await page.screenshot({
    path: 'test-results/p07-run-mobile.png',
    fullPage: true,
  });
  await page.getByLabel('Rating').selectOption('helpful');
  await page.getByLabel('Reason').fill('Grounded');
  await page.getByRole('button', { name: 'Save feedback' }).click();
  await page.getByText('Feedback saved.').waitFor();
  await page.goto(`${app}/app/ai/runs`);
  await page.getByRole('heading', { name: 'AI runs' }).waitFor();
  await page.getByRole('link', { name: /draft/ }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    'P07 authenticated AI settings, draft, inspector, feedback, and 320-1024px UI passed',
  );
} finally {
  await browser?.close();
  if (workspaceId) {
    for (const table of ['audit_logs', 'workspace_members'])
      assert.ifError(
        (await service.from(table).delete().eq('workspace_id', workspaceId))
          .error,
      );
    assert.ifError(
      (await service.from('workspaces').delete().eq('id', workspaceId)).error,
    );
  }
  if (userId)
    assert.ifError((await service.auth.admin.deleteUser(userId)).error);
}
