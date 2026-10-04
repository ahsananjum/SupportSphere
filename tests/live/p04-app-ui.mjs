import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const base = process.env.P04_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
const ref = process.env.P04_LIVE_TEST_PROJECT_REF;
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P04 opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `p04-browser-${randomUUID().slice(0, 8)}@example.invalid`;
const password = 'Test!' + randomBytes(24).toString('base64url');
const created = await service.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
assert.ifError(created.error);
const workspaceIds = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const noOverflow = async (label) =>
  assert.equal(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
    false,
    label,
  );
try {
  await page.goto(`${base}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue With Email' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page
    .getByRole('heading', { name: 'Create your workspace', exact: true })
    .waitFor();
  await page.getByLabel('Workspace name').fill('P04 Browser Workspace');
  await page
    .getByLabel('Workspace URL slug')
    .fill(`p04-browser-${randomUUID().slice(0, 8)}`);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page
    .getByRole('heading', { name: 'Support identity', exact: true })
    .waitFor();
  await page.getByLabel('Company or organization').fill('P04 Company');
  await page.getByLabel('Support team name').fill('P04 Care');
  await page.getByLabel('Public support email').fill('support@example.com');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page
    .getByRole('heading', { name: 'Website & sender', exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page
    .getByRole('heading', { name: 'Bring in your team', exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Continue to knowledge' }).click();
  await page
    .getByRole('heading', { name: 'Knowledge source', exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page
    .getByRole('heading', { name: 'Set your AI preference', exact: true })
    .waitFor();
  await page.getByLabel(/Draft only/).check();
  await page.getByRole('button', { name: 'Finish workspace setup' }).click();
  await page.waitForURL(/\/app$/);
  const workspace = await service
    .from('workspaces')
    .select('id')
    .eq('name', 'P04 Browser Workspace')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  assert.ifError(workspace.error);
  workspaceIds.push(workspace.data.id);

  await page.goto(`${base}/app/customers`);
  await page.getByRole('heading', { name: 'Customers', exact: true }).waitFor();
  await page.getByText('Add customer', { exact: true }).click();
  await page.getByLabel('Name').fill('Grace Hopper');
  await page.getByLabel('Email').fill('grace@example.com');
  await page.getByLabel('Company').fill('Compiler Labs');
  await page.getByRole('button', { name: 'Save customer' }).click();
  await page
    .getByRole('heading', { name: 'Grace Hopper', exact: true })
    .waitFor();
  await page
    .getByRole('heading', { name: 'Start a conversation', exact: true })
    .waitFor();
  await page.getByLabel('Subject').fill('Login question');
  await page.getByRole('button', { name: 'Start conversation' }).click();
  await page
    .getByRole('heading', { name: 'Login question', exact: true })
    .waitFor();
  await noOverflow('conversation overflow at 390');
  await page.getByLabel('Reply').fill('Hi Grace, I can help with that.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText('Hi Grace, I can help with that.').waitFor();
  await page.getByText('Message sent.', { exact: true }).waitFor();
  await page.getByLabel('Reply').fill('Internal routing note');
  await page.getByLabel('Internal note').check();
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByText('Internal note saved.', { exact: true }).waitFor();
  await page.getByText('Internal routing note').waitFor();
  await page.getByRole('button', { name: 'Create ticket' }).click();
  await page.getByLabel('Title').fill('Investigate login issue');
  await page
    .getByLabel('Description')
    .fill('Customer cannot access the account.');
  await page.getByRole('button', { name: 'Create ticket' }).last().click();
  await page
    .getByRole('heading', { name: 'Investigate login issue', exact: true })
    .waitFor();
  await page.getByText('created', { exact: true }).waitFor();
  await page.getByLabel('Status').selectOption('resolved');
  await page.getByRole('button', { name: 'Save ticket' }).click();
  await page.getByText('Ticket updated.').waitFor();
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/app/inbox', '/app/tickets', '/app/customers']) {
      await page.goto(base + path);
      await noOverflow(`${path} overflow at ${width}`);
    }
  }
  process.stdout.write(
    'P04 authenticated customer → conversation → message → note → ticket browser journey passed.\n',
  );
} finally {
  await browser.close();
  if (workspaceIds.length) {
    await service
      .from('ticket_events')
      .delete()
      .in('workspace_id', workspaceIds);
    await service.from('messages').delete().in('workspace_id', workspaceIds);
    await service.from('tickets').delete().in('workspace_id', workspaceIds);
    await service
      .from('conversations')
      .delete()
      .in('workspace_id', workspaceIds);
    await service
      .from('customer_identities')
      .delete()
      .in('workspace_id', workspaceIds);
    await service.from('customers').delete().in('workspace_id', workspaceIds);
    await service.from('audit_logs').delete().in('workspace_id', workspaceIds);
    await service
      .from('workspace_members')
      .delete()
      .in('workspace_id', workspaceIds);
    await service.from('workspaces').delete().in('id', workspaceIds);
  }
  if (created.data.user)
    await service.auth.admin.deleteUser(created.data.user.id);
}
