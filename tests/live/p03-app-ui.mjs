import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = process.env.P03_LIVE_TEST_PROJECT_REF;
assert(
  url && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere project opt-in required.',
);
assert(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const base = process.env.P03_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const owner = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const run = randomUUID().slice(0, 8);
const email = `p03-browser-${run}@example.invalid`;
const password = 'Test!' + randomBytes(24).toString('base64url');
const created = await service.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
assert.ifError(created.error);
const workspaceIds = [];
const roleUserIds = [];
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
const go = async (path) => page.goto(base + path);
const visible = async (name) =>
  page.getByRole('heading', { name, exact: true }).waitFor();
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
const capture = process.env.P03_CAPTURE_SCREENSHOTS === '1';
if (capture) await mkdir('test-results/p03-visual', { recursive: true });
const screenshot = async (name) => {
  if (capture)
    await page.screenshot({
      path: `test-results/p03-visual/${name}.png`,
      fullPage: true,
    });
};
try {
  await go('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue With Email' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await visible('Create your workspace');
  await page.getByLabel('Workspace name').fill('P03 Browser Workspace');
  await page.getByLabel('Workspace URL slug').fill(`p03-browser-${run}`);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await visible('Support identity');
  await noOverflow('identity setup overflow at 320');
  await screenshot('onboarding-320');
  assert.match(page.url(), /\/app\/onboarding/);
  assert.ifError(
    (await owner.auth.signInWithPassword({ email, password })).error,
  );
  const first = await owner
    .from('workspaces')
    .select('id')
    .eq('slug', `p03-browser-${run}`)
    .single();
  assert.ifError(first.error);
  workspaceIds.push(first.data.id);
  await page.reload();
  await visible('Support identity');
  await go('/app/team');
  await visible('Support identity');
  await go('/app/settings/general');
  await visible('Support identity');
  await page.getByLabel('Company or organization').fill('P03 Company');
  await page.getByLabel('Support team name').fill('Care team');
  await page.getByLabel('Public support email').fill('help@example.com');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await visible('Website & sender');
  await noOverflow('origin setup overflow at 320');
  await page.reload();
  await visible('Website & sender');
  await page.getByLabel('Website origin').fill('https://example.com');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await visible('Bring in your team');
  await noOverflow('team setup overflow at 320');
  await page.reload();
  await visible('Bring in your team');
  await page.getByRole('button', { name: 'Continue to knowledge' }).click();
  await visible('Knowledge source');
  await noOverflow('knowledge setup overflow at 320');
  await page.reload();
  await visible('Knowledge source');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await visible('Set your AI preference');
  await noOverflow('AI setup overflow at 320');
  await page.reload();
  await visible('Set your AI preference');
  await page.getByLabel(/Draft only/).check();
  await page.getByRole('button', { name: 'Finish workspace setup' }).click();
  await page.waitForURL(/\/app$/);
  await go('/app/onboarding');
  await page.waitForURL(/\/app$/);
  await go('/app/notifications');
  await page.getByText('Workspace ready').waitFor();
  await page.getByRole('button', { name: 'Mark read' }).click();
  await page.getByText('Notification marked as read.').waitFor();
  await go('/app/settings/general');
  await page.getByLabel('Support team name').fill('Customer care');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await page.getByText('Workspace settings saved.').waitFor();
  await page.reload();
  assert.equal(
    await page.getByLabel('Support team name').inputValue(),
    'Customer care',
  );
  for (const width of [320, 360, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await go('/app/team');
    await visible('Team');
    await noOverflow(`team overflow at ${width}`);
    await page
      .getByText('The last owner cannot change role or be removed.')
      .waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Remove', exact: true }).count(),
      0,
    );
    if (width === 390 || width === 1280) await screenshot(`team-${width}`);
    if (width <= 768) {
      const menu = page.getByRole('button', { name: 'Open workspace menu' });
      await menu.click();
      await page
        .getByRole('navigation', { name: 'Application navigation' })
        .waitFor();
      await page.keyboard.press('Escape');
      assert.equal(
        await menu.evaluate((el) => el === document.activeElement),
        true,
      );
    }
    await go('/app/settings/general');
    await page.getByLabel('Workspace name').waitFor();
    await noOverflow(`settings overflow at ${width}`);
    if (width === 390) await screenshot('general-390');
    await go('/app/settings/security');
    await visible('Security');
    await noOverflow(`security overflow at ${width}`);
    if (width === 390) await screenshot('security-390');
  }
  const second = await owner.rpc('create_workspace', {
    p_name: 'Second P03 Workspace',
    p_slug: `p03-second-${run}`,
    p_timezone: 'UTC',
  });
  assert.ifError(second.error);
  workspaceIds.push(String(second.data));
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.reload();
  await page.getByLabel('Active workspace').selectOption(String(second.data));
  await page.getByRole('button', { name: 'Switch workspace' }).click();
  await visible('Support identity');
  assert.match(page.url(), /\/app\/onboarding/);
  await go('/app/notifications');
  await visible('Support identity');
  await page.getByLabel('Active workspace').selectOption(workspaceIds[0]);
  await page.getByRole('button', { name: 'Switch workspace' }).click();
  await page.waitForURL(/\/app$/);
  await go('/app/settings/security');
  await visible('Security');
  for (const role of ['viewer', 'agent', 'admin']) {
    const roleEmail = `p03-${role}-${run}@example.invalid`;
    const rolePassword = 'Test!' + randomBytes(24).toString('base64url');
    const roleCreated = await service.auth.admin.createUser({
      email: roleEmail,
      password: rolePassword,
      email_confirm: true,
    });
    assert.ifError(roleCreated.error);
    roleUserIds.push(roleCreated.data.user.id);
    const hash = randomBytes(32).toString('hex');
    assert.ifError(
      (
        await owner.rpc('create_invitation', {
          p_workspace_id: workspaceIds[0],
          p_email: roleEmail,
          p_role: role,
          p_token_hash: hash,
        })
      ).error,
    );
    const roleClient = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    assert.ifError(
      (
        await roleClient.auth.signInWithPassword({
          email: roleEmail,
          password: rolePassword,
        })
      ).error,
    );
    assert.equal(
      (await roleClient.rpc('accept_invitation', { p_token_hash: hash })).data,
      'accepted',
    );
    const rolePage = await browser.newPage({
      viewport: { width: 1024, height: 900 },
    });
    await rolePage.goto(base + '/login');
    await rolePage.getByLabel('Email address').fill(roleEmail);
    await rolePage.getByRole('button', { name: 'Continue With Email' }).click();
    await rolePage.getByLabel('Password').fill(rolePassword);
    await rolePage.getByRole('button', { name: 'Sign in' }).click();
    await rolePage
      .getByRole('heading', { name: 'P03 Browser Workspace', exact: true })
      .waitFor();
    await rolePage.goto(base + '/app/team');
    await rolePage
      .getByRole('heading', { name: 'Team', exact: true })
      .waitFor();
    const inviteVisible = await rolePage
      .getByRole('heading', { name: 'Invite a teammate' })
      .isVisible();
    assert.equal(inviteVisible, role === 'admin', `${role} invite UI`);
    const settingsLink = await rolePage
      .getByRole('navigation', { name: 'Application navigation' })
      .getByRole('link', { name: 'General settings' })
      .count();
    assert.equal(
      settingsLink,
      role === 'admin' ? 1 : 0,
      `${role} settings nav`,
    );
    await rolePage.goto(base + '/app/settings/general');
    if (role === 'admin') await rolePage.getByLabel('Workspace name').waitFor();
    else
      await rolePage
        .getByText('Your role cannot change workspace settings.')
        .waitFor();
    await rolePage.goto(base + '/app/settings/security');
    await rolePage
      .getByText('Only workspace owners can view security settings.')
      .waitFor();
    await rolePage.close();
  }
  process.stdout.write(
    'P03 authenticated browser journey passed: refresh/re-entry, route guards, settings, notifications, seven widths, drawer, workspace switching, owner/admin/agent/viewer UI.\n',
  );
} finally {
  await browser.close();
  if (workspaceIds.length) {
    await service.from('audit_logs').delete().in('workspace_id', workspaceIds);
    await service
      .from('notifications')
      .delete()
      .in('workspace_id', workspaceIds);
    await service
      .from('workspace_invitations')
      .delete()
      .in('workspace_id', workspaceIds);
    await service
      .from('workspace_members')
      .delete()
      .in('workspace_id', workspaceIds);
    await service.from('workspaces').delete().in('id', workspaceIds);
  }
  if (created.data.user)
    await service.auth.admin.deleteUser(created.data.user.id);
  for (const id of roleUserIds) await service.auth.admin.deleteUser(id);
}
