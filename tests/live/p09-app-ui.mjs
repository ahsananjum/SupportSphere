import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P09_LIVE_TEST_PROJECT_REF;
const app = process.env.P09_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P09 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `p09-ui-${randomUUID().slice(0, 8)}@example.invalid`;
const password = `Test!${randomBytes(24).toString('base64url')}`;
let userId;
let workspaceId;
let browser;
let client;
const ok = (result, label) => {
  assert.ifError(result.error, label);
  return result.data;
};
try {
  userId = ok(
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
    'create user',
  ).user.id;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok(await client.auth.signInWithPassword({ email, password }), 'sign in');
  workspaceId = ok(
    await client.rpc('create_workspace', {
      p_name: 'P09 UI',
      p_slug: `p09-ui-${randomUUID().slice(0, 8)}`,
      p_timezone: 'UTC',
    }),
    'workspace',
  );
  ok(
    await service
      .from('workspaces')
      .update({
        company_name: 'P09 UI',
        support_name: 'P09 UI care',
        support_email: email,
        onboarding_step: 'complete',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', workspaceId),
    'onboarding',
  );
  ok(
    await client.rpc('ensure_evaluation_cases', {
      p_workspace_id: workspaceId,
    }),
    'evaluation cases',
  );
  const evaluationRunId = ok(
    await client.rpc('run_ai_evaluation', { p_workspace_id: workspaceId }),
    'evaluation run',
  );
  const evaluationResults = ok(
    await client
      .from('evaluation_results')
      .select('passed,failure_code')
      .eq('evaluation_run_id', evaluationRunId),
    'evaluation results',
  );
  assert.equal(
    evaluationResults.length,
    5,
    'curated evaluation cases persisted',
  );
  assert(
    evaluationResults.every(
      (result) =>
        result.passed === false && result.failure_code === 'NO_MATCHING_INPUT',
    ),
    'missing real runs remain explicit failures',
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
  await page.goto(`${app}/app/analytics`);
  await page.getByRole('heading', { name: 'Analytics', exact: true }).waitFor();
  await page.getByText('No data').first().waitFor();
  await page
    .getByRole('heading', { name: 'Curated evaluation harness' })
    .waitFor();
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      (await page.evaluate(() => document.documentElement.scrollWidth)) <=
        width + 1,
      `analytics overflow at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'P09 authenticated analytics empty-state and 320-1024px UI passed',
  );
} finally {
  await browser?.close();
  if (workspaceId) {
    await service
      .from('evaluation_results')
      .delete()
      .eq('workspace_id', workspaceId);
    await service
      .from('evaluation_runs')
      .delete()
      .eq('workspace_id', workspaceId);
    await service
      .from('evaluation_cases')
      .delete()
      .eq('workspace_id', workspaceId);
    await service.from('audit_logs').delete().eq('workspace_id', workspaceId);
    await service
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId);
    await service.from('workspaces').delete().eq('id', workspaceId);
  }
  if (userId) await service.auth.admin.deleteUser(userId);
}
