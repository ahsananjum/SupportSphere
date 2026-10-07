import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P06_LIVE_TEST_PROJECT_REF;
const app = process.env.P06_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P06 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const email = `p06-ui-${randomUUID().slice(0, 8)}@example.invalid`;
const password = 'Test!' + randomBytes(24).toString('base64url');
let userId;
let workspaceId;
let browser;
try {
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(created.error);
  userId = created.data.user.id;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (await client.auth.signInWithPassword({ email, password })).error,
  );
  const workspace = await client.rpc('create_workspace', {
    p_name: 'P06 UI',
    p_slug: `p06-ui-${randomUUID().slice(0, 8)}`,
    p_timezone: 'UTC',
  });
  assert.ifError(workspace.error);
  workspaceId = workspace.data;
  assert.ifError(
    (
      await service
        .from('workspaces')
        .update({
          company_name: 'P06 UI',
          support_name: 'P06 UI care',
          support_email: email,
          onboarding_step: 'complete',
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', workspaceId)
    ).error,
  );
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const browserErrors = [];
  page.on('pageerror', (error) => browserErrors.push(error.message));
  await page.goto(`${app}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Continue With Email' }).click();
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/app$/);
  await page.goto(`${app}/app/knowledge`);
  await page.getByRole('heading', { name: 'Knowledge', exact: true }).waitFor();
  await page.getByText('No sources yet').waitFor();
  for (const width of [320, 360, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `Knowledge overflow at ${width}px`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(350);
  assert.equal(
    await page
      .locator('#workspace-menu')
      .evaluate((element) => getComputedStyle(element).visibility),
    'hidden',
  );
  await page.getByRole('button', { name: 'Open workspace menu' }).click();
  await page
    .getByRole('navigation', { name: 'Application navigation' })
    .waitFor();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(350);
  assert.equal(
    await page
      .locator('#workspace-menu')
      .evaluate((element) => getComputedStyle(element).visibility),
    'hidden',
  );
  await mkdir('test-results', { recursive: true });
  await page.screenshot({
    path: 'test-results/p06-knowledge-mobile.png',
    fullPage: true,
  });
  await page.getByLabel('Source name').first().fill('P06 UI paste');
  await page
    .getByLabel('Content')
    .fill('SupportSphere gives customers a clear reply and a human handoff.');
  await page.getByRole('button', { name: 'Add text source' }).click();
  await page
    .getByText('Source queued. Indexing continues in the background.')
    .waitFor();
  await page.getByRole('link', { name: 'P06 UI paste' }).waitFor();
  const paste = await service
    .from('knowledge_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('name', 'P06 UI paste')
    .single();
  assert.ifError(paste.error);
  await page.getByRole('link', { name: 'P06 UI paste' }).click();
  await page.getByText(/Last indexed/).waitFor({ timeout: 180000 });
  await page.getByText('SupportSphere gives customers').waitFor();
  await page.getByRole('button', { name: 'Disable' }).click();
  await page.getByText('Source updated.').waitFor();
  const disabled = await service
    .from('knowledge_sources')
    .select('enabled')
    .eq('id', paste.data.id)
    .single();
  assert.equal(disabled.data.enabled, false);
  await page.getByRole('button', { name: 'Enable' }).click();
  await page.getByText('Source updated.').waitFor();
  await page.goto(`${app}/app/knowledge`);
  await page.getByLabel('Source name').last().fill('P06 UI file');
  await page.getByLabel('TXT, MD, or text PDF').setInputFiles({
    name: 'oversized.txt',
    mimeType: 'text/plain',
    buffer: Buffer.alloc(4_194_305, 65),
  });
  await page.getByRole('button', { name: 'Upload and index' }).click();
  await page
    .getByText('Choose a named TXT, MD, or text PDF file under 4 MB.')
    .waitFor();
  await page.getByLabel('TXT, MD, or text PDF').setInputFiles({
    name: 'guide.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('A customer may request human support at any time.'),
  });
  await page.getByRole('button', { name: 'Upload and index' }).click();
  await page
    .getByText('File uploaded. Indexing continues in the background.')
    .waitFor();
  const file = await service
    .from('knowledge_sources')
    .select('id,storage_path')
    .eq('workspace_id', workspaceId)
    .eq('name', 'P06 UI file')
    .single();
  assert.ifError(file.error);
  await page.getByRole('link', { name: 'P06 UI file' }).click();
  await page.getByText(/Last indexed/).waitFor({ timeout: 180000 });
  await page.getByText('A customer may request human support').waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL(/\/app\/knowledge$/);
  const removed = await service
    .from('knowledge_sources')
    .select('id')
    .eq('id', file.data.id);
  assert.equal(removed.data.length, 0);
  const stored = await service.storage
    .from('knowledge-private')
    .list(`workspace/${workspaceId}/knowledge/${file.data.id}`);
  assert.ifError(stored.error);
  assert.equal(stored.data.length, 0);
  await page.getByLabel('Source name').last().fill('P06 UI broken');
  await page.getByLabel('TXT, MD, or text PDF').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-broken'),
  });
  await page.getByRole('button', { name: 'Upload and index' }).click();
  await page.getByRole('link', { name: 'P06 UI broken' }).click();
  await page
    .getByRole('alert')
    .getByText(/PDF could not be parsed/)
    .waitFor({ timeout: 180000 });
  assert.equal(await page.getByRole('button', { name: 'Retry' }).count(), 0);
  assert.deepEqual(browserErrors, []);
  console.log('P06 authenticated knowledge UI proof passed');
} finally {
  await browser?.close();
  if (workspaceId) {
    const sources = await service
      .from('knowledge_sources')
      .select('storage_path')
      .eq('workspace_id', workspaceId);
    const paths = (sources.data ?? [])
      .map((item) => item.storage_path)
      .filter(Boolean);
    if (paths.length)
      await service.storage.from('knowledge-private').remove(paths);
    assert.ifError(
      (
        await service
          .from('audit_logs')
          .delete()
          .eq('workspace_id', workspaceId)
      ).error,
    );
    assert.ifError(
      (
        await service
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspaceId)
      ).error,
    );
    assert.ifError(
      (await service.from('workspaces').delete().eq('id', workspaceId)).error,
    );
  }
  if (userId) await service.auth.admin.deleteUser(userId);
}
