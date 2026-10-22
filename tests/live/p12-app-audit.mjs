// Real application regression audit. Fixtures are isolated to an explicit project
// and cleaned even on failure. No credentials, transcripts, or signing secrets
// are included in the generated route/control report.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium, expect } from '@playwright/test';

const ref = process.env.P12_LIVE_TEST_PROJECT_REF;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(
  ref &&
    url === `https://${ref}.supabase.co` &&
    key &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  'Explicit P12 project opt-in and server credentials are required.',
);
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const client = createClient(url, key, { auth: { persistSession: false } });
const run = randomUUID().slice(0, 8);
const email = `p12-audit-${run}@example.invalid`;
const password = `Test!${randomBytes(24).toString('base64url')}`;
const base = process.env.P12_LIVE_BASE_URL ?? 'http://127.0.0.1:3300';
const report = [];
const errors = [];
let userId, workspaceId, browser, server;
const ok = (result, label) => {
  assert.equal(result.error, null, label);
  return result.data;
};
const routes = [
  '/app',
  '/app/inbox',
  '/app/tickets',
  '/app/customers',
  '/app/knowledge',
  '/app/automations',
  '/app/analytics',
  '/app/ai/runs',
  '/app/team',
  '/app/notifications',
  '/app/settings/general',
  '/app/settings/widget',
  '/app/settings/ai',
  '/app/settings/integrations',
  '/app/settings/security',
];
const artifactDir = 'test-results/p12';
try {
  if (!process.env.P12_LIVE_BASE_URL) {
    server = spawn(
      process.execPath,
      [
        'node_modules/next/dist/bin/next',
        'start',
        '--hostname',
        '127.0.0.1',
        '--port',
        '3300',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error('Production server did not start')),
        20000,
      );
      server.on('exit', () => {
        clearTimeout(timer);
        reject(new Error('Production server exited'));
      });
      server.stdout.on('data', (data) => {
        if (data.toString().includes('Ready')) {
          clearTimeout(timer);
          resolve();
        }
      });
    });
  }
  userId = ok(
    await admin.auth.admin.createUser({ email, password, email_confirm: true }),
    'create disposable user',
  ).user.id;
  ok(
    await client.auth.signInWithPassword({ email, password }),
    'authenticate fixture',
  );
  workspaceId = ok(
    await client.rpc('create_workspace', {
      p_name: `P12 Audit ${run}`,
      p_slug: `p12-audit-${run}`,
      p_timezone: 'UTC',
    }),
    'create isolated workspace',
  );
  ok(
    await admin
      .from('workspaces')
      .update({
        company_name: 'P12 Test',
        support_name: 'Audit support',
        support_email: email,
        onboarding_step: 'complete',
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', workspaceId),
    'finish test setup',
  );
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.setDefaultTimeout(20000);
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const go = async (path) => {
    const response = await page.goto(base + path, { waitUntil: 'networkidle' });
    assert(response && response.status() < 400, `${path} status`);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(
      page.getByRole('heading', { name: 'Workspace unavailable' }),
    ).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /noindex/,
    );
  };
  await page.goto(base + '/login', { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue With Email' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/app$/);
  for (const path of routes) {
    await go(path);
    report.push({
      path,
      state: 'initial/empty',
      title: await page.title(),
      controls: await page
        .locator(
          'main button, main summary, main a, main input:not([type=hidden]), main select, main textarea',
        )
        .evaluateAll((elements) =>
          elements.map((element) => ({
            tag: element.tagName,
            name:
              element.getAttribute('aria-label') ||
              element.getAttribute('name') ||
              element.textContent?.trim(),
            href:
              element.tagName === 'A'
                ? element.getAttribute('href')
                : undefined,
          })),
        ),
    });
  }
  console.log('P12 all initial authenticated route states passed');

  // These tests deliberately bypass native validation to exercise server errors.
  await go('/app/customers');
  await page.getByText('Add customer', { exact: true }).click();
  await page.locator('.support-form').evaluate((form) => {
    form.noValidate = true;
  });
  await page.getByLabel('Name', { exact: true }).fill('P12 customer');
  await page.getByLabel('Email', { exact: true }).fill('invalid');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await expect(page.locator('#customer-email')).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await expect(page.locator('#email-error')).toBeVisible();
  await page
    .getByLabel('Email', { exact: true })
    .fill(`customer-${run}@example.invalid`);
  await page.getByRole('button', { name: 'Save customer' }).click();
  await page.waitForURL(/\/app\/customers\/[a-f0-9-]+$/);
  const customerPath = new URL(page.url()).pathname;
  await page.getByLabel('Subject').fill(`P12 conversation ${run}`);
  await page.getByRole('button', { name: 'Start conversation' }).click();
  await page.waitForURL(/\/app\/inbox\/[a-f0-9-]+$/);
  const conversationPath = new URL(page.url()).pathname;
  await page.getByLabel('Reply').fill('Synthetic P12 reply');
  await page.getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page.getByText('Message sent.', { exact: true })).toBeVisible();
  await page.getByLabel('Reply').fill('Synthetic P12 internal note');
  await page.getByLabel('Internal note', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Save internal note', exact: true })
    .click();
  await expect(
    page.getByText('Internal note saved.', { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByLabel('Status', { exact: true }).selectOption('pending');
  await page.getByRole('button', { name: 'Save routing' }).click();
  await expect(
    page.getByText('Conversation updated.', { exact: true }),
  ).toBeVisible();
  await page.getByLabel('Title', { exact: true }).fill(`P12 ticket ${run}`);
  await page
    .getByRole('button', { name: 'Create ticket', exact: true })
    .click();
  await page.waitForURL(/\/app\/tickets\/[a-f0-9-]+$/);
  const ticketPath = new URL(page.url()).pathname;
  await page.getByLabel('Status', { exact: true }).selectOption('resolved');
  await page.getByRole('button', { name: 'Save ticket' }).click();
  await expect(
    page.getByText('Ticket updated.', { exact: true }),
  ).toBeVisible();
  console.log('P12 persisted support write and field-error journey passed');

  await go('/app/automations');
  await page
    .getByLabel('Rule name', { exact: true })
    .fill(`P12 ticket rule ${run}`);
  await page.locator('select[name="actionType"]').selectOption('create_ticket');
  await page
    .getByLabel('Ticket title', { exact: true })
    .fill('P12 automated follow-up');
  await page
    .getByRole('checkbox', {
      name: 'Run this rule when matching events arrive',
    })
    .uncheck();
  await page.getByRole('button', { name: 'Save automation' }).click();
  await expect(
    page.getByText('Automation rule saved.', { exact: true }),
  ).toBeVisible();
  const ruleRow = page
    .locator('.automation-rule-row')
    .filter({ hasText: `P12 ticket rule ${run}` });
  await ruleRow.getByRole('button', { name: 'Enable', exact: true }).click();
  await expect(
    ruleRow.getByText('Automation enabled.', { exact: true }),
  ).toBeVisible();
  await ruleRow.getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(
    ruleRow.getByText('Automation disabled.', { exact: true }),
  ).toBeVisible();
  await ruleRow.getByRole('checkbox').check();
  await ruleRow.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(ruleRow).toHaveCount(0);
  console.log(
    'P12 automation ticket-action fields, toggle and confirmed delete passed',
  );

  await go('/app/settings/general');
  await page.getByLabel('Timezone', { exact: true }).fill('Invalid/Timezone');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByLabel('Timezone', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Timezone', { exact: true }).fill('UTC');
  await page.getByLabel('Support team name').fill('P12 saved support');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    page.getByText('Workspace settings saved.', { exact: true }),
  ).toBeVisible();
  await go('/app/settings/widget');
  await page
    .getByLabel('Allowed website origins')
    .fill('https://example.invalid/path');
  await page.getByRole('button', { name: 'Save widget settings' }).click();
  await expect(
    page.getByText('Add 1–10 valid website origins, one per line.'),
  ).toBeVisible();
  await page
    .getByLabel('Allowed website origins')
    .fill('https://example.invalid');
  await page.getByRole('checkbox', { name: 'Enable website widget' }).check();
  await page.getByRole('button', { name: 'Save widget settings' }).click();
  await expect(
    page.getByText('Widget settings saved.', { exact: true }),
  ).toBeVisible();
  await go('/app/settings/ai');
  await page.getByRole('radio', { name: /^Off/ }).check();
  await page.getByRole('button', { name: 'Save AI policy' }).click();
  await expect(page.locator('.form-success')).toBeVisible();
  await go('/app/analytics');
  await page.getByRole('button', { name: 'Prepare cases and run' }).click();
  await expect(
    page.getByText('Evaluation run saved from persisted AI records.'),
  ).toBeVisible();
  console.log(
    'P12 settings validation/persistence and evaluation action passed',
  );

  // A pasted source goes through the real durable ingestion pipeline. We inspect
  // real state only and do not invent a ready status to make the test pass.
  await go('/app/knowledge');
  await page.getByText('Add knowledge', { exact: true }).click();
  await page.locator('#knowledge-text-name').fill(`P12 knowledge ${run}`);
  await page
    .locator('#knowledge-text-content')
    .fill(
      'Synthetic support policy for P12. Contact a human agent when evidence is missing.',
    );
  await page.getByRole('button', { name: 'Add text source' }).click();
  await expect(
    page.getByText('Source queued. Indexing continues in the background.'),
  ).toBeVisible();
  const source = ok(
    await admin
      .from('knowledge_sources')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('name', `P12 knowledge ${run}`)
      .single(),
    'real source persisted',
  );
  const sourcePath = `/app/knowledge/${source.id}`;
  await go(sourcePath);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    `P12 knowledge ${run}`,
  );
  await go('/app/knowledge');
  const sourceRow = page
    .locator('.knowledge-source-row')
    .filter({ hasText: `P12 knowledge ${run}` });
  await sourceRow.getByRole('button', { name: 'Disable', exact: true }).click();
  await expect(
    sourceRow.getByRole('button', { name: 'Enable', exact: true }),
  ).toBeVisible();
  await sourceRow.getByRole('button', { name: 'Enable', exact: true }).click();
  await expect(
    sourceRow.getByRole('button', { name: 'Disable', exact: true }),
  ).toBeVisible();
  const detailPaths = [customerPath, conversationPath, ticketPath, sourcePath];
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [...routes, ...detailPaths]) {
      await go(path);
      const overflow = await page.evaluate(() => ({
        value:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        offenders: [...document.querySelectorAll('*')]
          .map((element) => ({
            tag: element.tagName,
            className:
              typeof element.className === 'string' ? element.className : '',
            right: Math.round(element.getBoundingClientRect().right),
          }))
          .filter(
            (item) => item.right > document.documentElement.clientWidth + 1,
          )
          .slice(0, 8),
      }));
      assert.equal(
        overflow.value,
        false,
        `${path} overflow at ${width}: ${JSON.stringify(overflow)}`,
      );
      assert.equal(
        await page.locator('main').count(),
        1,
        `${path} main landmark`,
      );
      report.push({
        path,
        width,
        state: 'populated',
        overflow: false,
        console: 'checked',
      });
    }
    if (width <= 768) {
      await page.getByRole('button', { name: 'Open workspace menu' }).click();
      await expect(
        page.getByRole('dialog', { name: 'Workspace menu' }),
      ).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Open workspace menu' }),
      ).toBeFocused();
    }
  }
  await mkdir(artifactDir, { recursive: true });
  for (const [label, path] of [
    ['conversation', conversationPath],
    ['tickets', '/app/tickets'],
    ['automations', '/app/automations'],
  ]) {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await go(path);
      await page.screenshot({
        path: `${artifactDir}/${label}-${width}.png`,
        fullPage: true,
      });
    }
  }
  // Role checks use persisted membership, never client-controlled roles.
  for (const role of ['admin', 'agent', 'viewer']) {
    ok(
      await admin
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId),
      'set disposable membership role',
    );
    for (const path of [
      '/app/customers',
      '/app/tickets',
      customerPath,
      conversationPath,
      ticketPath,
      '/app/automations',
      '/app/knowledge',
      '/app/settings/security',
    ]) {
      await go(path);
      if (role === 'viewer')
        for (const name of [
          'Save customer',
          'Start conversation',
          'Send message',
          'Create ticket',
          'Save routing',
          'Save ticket',
          'Save automation',
          'Add text source',
        ])
          await expect(
            page.getByRole('button', { name, exact: true }),
          ).toHaveCount(0);
      report.push({ path, role, permission: 'verified' });
    }
    if (role === 'viewer') {
      const denied = await client.rpc('create_or_get_customer', {
        p_workspace_id: workspaceId,
        p_name: 'Forbidden P12',
        p_email: 'forbidden@example.invalid',
        p_phone: '',
        p_company: '',
        p_provider: 'manual',
        p_identity_key: '',
      });
      assert(denied.error, 'viewer direct RPC must fail');
    }
  }
  ok(
    await admin
      .from('workspace_members')
      .update({ role: 'owner' })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId),
    'restore fixture owner',
  );
  assert.deepEqual(errors, [], 'browser page/console errors');
  await writeFile(
    `${artifactDir}/route-control-report.json`,
    JSON.stringify({ project: ref, passed: true, checks: report }, null, 2),
  );
  console.log(
    `P12 authenticated route/control audit passed: ${report.length} checks; no overflow/page/console errors`,
  );
} finally {
  await browser?.close();
  server?.kill();
  if (workspaceId) {
    // Child content is test-only. Workspace FKs cascade; retained audit data
    // must be explicitly removed before deleting the test workspace.
    ok(
      await admin.from('audit_logs').delete().eq('workspace_id', workspaceId),
      'cleanup audit',
    );
    ok(
      await admin.from('workspaces').delete().eq('id', workspaceId),
      'cleanup workspace',
    );
  }
  if (userId) ok(await admin.auth.admin.deleteUser(userId), 'cleanup user');
  console.log('P12 disposable workspace/user cleanup completed');
}
