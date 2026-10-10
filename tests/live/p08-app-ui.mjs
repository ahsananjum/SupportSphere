import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P08_LIVE_TEST_PROJECT_REF;
const app = process.env.P08_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P08 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `p08-ui-${randomUUID().slice(0, 8)}@example.invalid`;
const password = `Test!${randomBytes(24).toString('base64url')}`;
let userId;
let workspaceId;
let browser;
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
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok(await client.auth.signInWithPassword({ email, password }), 'sign in');
  workspaceId = ok(
    await client.rpc('create_workspace', {
      p_name: 'P08 UI',
      p_slug: `p08-ui-${randomUUID().slice(0, 8)}`,
      p_timezone: 'UTC',
    }),
    'workspace',
  );
  ok(
    await service
      .from('workspaces')
      .update({
        company_name: 'P08 UI',
        support_name: 'P08 UI care',
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
  await page.goto(`${app}/app/automations`);
  await page
    .getByRole('heading', { name: 'Automations', exact: true })
    .waitFor();
  await page.getByLabel('Rule name').fill('Urgent live rule');
  await page.getByLabel('Notification title').fill('Urgent event');
  await page.getByLabel('Notification body').fill('A live automation matched.');
  await page.getByRole('button', { name: 'Save automation' }).click();
  await page.waitForTimeout(2500);
  if (!(await page.getByText('Automation rule saved.').count())) {
    throw new Error(
      `Automation save failed: ${(await page.locator('[role="alert"]').allTextContents()).join(' | ')}`,
    );
  }
  await page.getByText('Urgent live rule').waitFor();
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      (await page.evaluate(() => document.documentElement.scrollWidth)) <=
        width + 1,
      `automation overflow at ${width}px`,
    );
  }
  assert.deepEqual(errors, []);
  console.log(
    'P08 authenticated automation create, status, and 320-1024px UI passed',
  );
} finally {
  await browser?.close();
  if (workspaceId) {
    await service
      .from('automation_runs')
      .delete()
      .eq('workspace_id', workspaceId);
    await service
      .from('automation_rules')
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
