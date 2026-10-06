import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P05_LIVE_TEST_PROJECT_REF;
const app = process.env.P05_LIVE_BASE_URL ?? 'http://127.0.0.1:3100';
const host = 'http://localhost:4177';
assert(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
  'Explicit SupportSphere P05 live opt-in required.',
);
const service = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const workspaceIds = [];
const users = [];
let hostProcess;
let browser;
let outsider;
let owner;
async function actor(label) {
  const email = `p05-${label}-${randomUUID().slice(0, 8)}@example.invalid`;
  const password = 'Test!' + randomBytes(24).toString('base64url');
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert.ifError(result.error);
  users.push(result.data.user.id);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert.ifError(
    (await client.auth.signInWithPassword({ email, password })).error,
  );
  const created = await client.rpc('create_workspace', {
    p_name: `P05 ${label}`,
    p_slug: `p05-${label}-${randomUUID().slice(0, 8)}`,
    p_timezone: 'UTC',
  });
  assert.ifError(created.error);
  workspaceIds.push(created.data);
  const completed = await service
    .from('workspaces')
    .update({
      company_name: `P05 ${label}`,
      support_name: `P05 ${label} care`,
      support_email: `${label}@example.invalid`,
      website_origin: host,
      onboarding_step: 'complete',
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', created.data);
  assert.ifError(completed.error);
  return { email, password, client, workspaceId: created.data };
}
try {
  owner = await actor('owner');
  outsider = await actor('outsider');
  browser = await chromium.launch();
  const agentPage = await browser.newPage({
    viewport: { width: 1024, height: 900 },
  });
  await agentPage.goto(`${app}/login`);
  await agentPage.getByLabel('Email address').fill(owner.email);
  await agentPage.getByRole('button', { name: 'Continue With Email' }).click();
  await agentPage.getByLabel('Password').fill(owner.password);
  await agentPage.getByRole('button', { name: 'Sign in' }).click();
  await agentPage.waitForURL(/\/app$/);
  await agentPage.goto(`${app}/app/settings/widget`);
  await agentPage.getByRole('heading', { name: 'Website widget' }).waitFor();
  await agentPage.getByLabel('Allowed website origins').fill(host);
  await agentPage.getByRole('button', { name: 'Save widget settings' }).click();
  await agentPage.getByText('Widget settings saved.').waitFor();
  const config = await service
    .from('widget_configs')
    .select('widget_key')
    .eq('workspace_id', owner.workspaceId)
    .single();
  assert.ifError(config.error);
  const widgetKey = config.data.widget_key;

  hostProcess = spawn(process.execPath, ['tests/widget-host/server.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, WIDGET_TEST_KEY: widgetKey, WIDGET_APP_ORIGIN: app },
    stdio: 'pipe',
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Test host did not start')),
      10000,
    );
    hostProcess.stdout.once('data', () => {
      clearTimeout(timeout);
      resolve();
    });
    hostProcess.once('error', reject);
  });
  await agentPage.goto(`${app}/app/inbox`);
  await agentPage.getByText('Live updates on').waitFor({ timeout: 12000 });
  let resolveOwnerEvent;
  const ownerEvent = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () =>
        reject(
          new Error(
            'Owner did not receive the customer Realtime message event',
          ),
        ),
      30000,
    );
    resolveOwnerEvent = () => {
      clearTimeout(timer);
      resolve();
    };
  });
  const ownerChannel = owner.client.channel(`p05-owner-${randomUUID()}`).on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `workspace_id=eq.${owner.workspaceId}`,
    },
    (event) => {
      if (event.new.body === 'Can someone help with my order?')
        resolveOwnerEvent();
    },
  );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Owner Realtime subscription did not settle')),
      10000,
    );
    ownerChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        resolve();
      }
      if (status === 'CHANNEL_ERROR') {
        clearTimeout(timer);
        reject(new Error('Owner Realtime channel error'));
      }
    });
  });
  const customer = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await customer.goto(host);
  await customer.evaluate(() => {
    window.__widgetEvents = [];
    window.addEventListener('message', (event) => {
      window.__widgetEvents.push({
        type: event.data?.type,
        origin: event.origin,
        sourceMatches:
          event.source ===
          document.querySelector('iframe[title="Customer support"]')
            ?.contentWindow,
      });
    });
  });
  const frame = customer.frameLocator('iframe[title="Customer support"]');
  await frame.getByRole('button', { name: /Open .* support/ }).click();
  const launcherBounds = await customer
    .locator('iframe[title="Customer support"]')
    .boundingBox();
  assert(
    launcherBounds?.width > 300,
    `Open widget remained clipped: ${JSON.stringify(await customer.evaluate(() => window.__widgetEvents))}`,
  );
  await frame
    .getByLabel('Your message')
    .fill('Can someone help with my order?');
  await frame.getByRole('button', { name: 'Send', exact: false }).click();
  await frame.getByText('Can someone help with my order?').waitFor();
  await ownerEvent;
  await owner.client.removeChannel(ownerChannel);
  await agentPage.getByText('Website conversation').waitFor({ timeout: 12000 });
  await agentPage.getByText('Website conversation').click();
  await agentPage.getByText('Can someone help with my order?').waitFor();
  await agentPage
    .getByLabel('Reply')
    .fill('Yes. Tell us the order number and we will check.');
  await agentPage.getByRole('button', { name: 'Send message' }).click();
  await frame
    .getByText('Yes. Tell us the order number and we will check.')
    .waitFor({ timeout: 12000 });
  await customer.screenshot({ path: 'test-results/p05-widget-mobile.png' });
  await agentPage.screenshot({ path: 'test-results/p05-inbox-desktop.png' });
  await agentPage.close();
  await customer.reload();
  await frame.getByRole('button', { name: /Open .* support/ }).click();
  await frame.getByText('Can someone help with my order?').waitFor();
  await frame
    .getByText('Yes. Tell us the order number and we will check.')
    .waitFor();
  await frame.getByLabel('Your message').press('Escape');
  const launcher = frame.getByRole('button', { name: /Open .* support/ });
  await launcher.waitFor();
  assert.equal(
    await launcher.evaluate((button) => document.activeElement === button),
    true,
    'Escape returns focus to launcher',
  );
  await launcher.click();
  const sessionRow = await service
    .from('widget_sessions')
    .select('conversation_id')
    .eq('workspace_id', owner.workspaceId)
    .single();
  assert.ifError(sessionRow.error);
  const historyRows = Array.from({ length: 105 }, (_, index) => ({
    workspace_id: owner.workspaceId,
    conversation_id: sessionRow.data.conversation_id,
    sender_type: 'agent',
    body: `History ${index}`,
  }));
  assert.ifError((await service.from('messages').insert(historyRows)).error);
  await customer.reload();
  await frame.getByRole('button', { name: /Open .* support/ }).click();
  await frame.getByRole('button', { name: 'Load older messages' }).waitFor();
  assert.equal(
    await frame.locator('.widget-message').count(),
    100,
    'latest transcript page is bounded',
  );
  await frame.getByRole('button', { name: 'Load older messages' }).click();
  await frame.getByText('Can someone help with my order?').waitFor();
  assert.equal(
    await frame.locator('.widget-message').count(),
    107,
    'older rows with matching timestamps remain reachable',
  );

  const invalidOrigin = await fetch(
    `${app}/api/widget/config?key=${widgetKey}`,
    { headers: { Origin: 'http://localhost:4178' } },
  );
  assert.equal(invalidOrigin.status, 403, 'hostile origin must fail');
  const guessedKey = await fetch(
    `${app}/api/widget/config?key=wgt_${'0'.repeat(32)}`,
    { headers: { Origin: host } },
  );
  assert.equal(guessedKey.status, 403, 'guessed key must fail');
  const guessedSession = await fetch(`${app}/api/widget/messages`, {
    headers: {
      'x-widget-key': widgetKey,
      Authorization: `Bearer ${randomBytes(32).toString('base64url')}`,
    },
  });
  assert.equal(guessedSession.status, 401, 'guessed session must fail');
  const token = await customer
    .frameLocator('iframe[title="Customer support"]')
    .locator('body')
    .evaluate(
      (_body, storageKey) => localStorage.getItem(storageKey),
      `supportsphere:${widgetKey}:${host}`,
    );
  assert(token, 'valid session persisted in isolated iframe storage');
  await frame.getByLabel('Your message').fill('Draft preserved while offline');
  await customer.context().setOffline(true);
  await frame
    .getByText('You are offline. Your message is still here.')
    .waitFor({ timeout: 8000 });
  assert.equal(
    await frame.getByLabel('Your message').inputValue(),
    'Draft preserved while offline',
  );
  await customer.context().setOffline(false);
  await frame.getByLabel('Your message').fill('');
  const oversized = await fetch(`${app}/api/widget/messages`, {
    method: 'POST',
    headers: {
      'x-widget-key': widgetKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: 'x'.repeat(7000), clientId: randomUUID() }),
  });
  assert.equal(oversized.status, 413, 'oversized request must fail');
  const retryId = randomUUID();
  async function retrySend() {
    return fetch(`${app}/api/widget/messages`, {
      method: 'POST',
      headers: {
        'x-widget-key': widgetKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        body: 'Same message after retry',
        clientId: retryId,
      }),
    });
  }
  const firstRetry = await retrySend();
  const secondRetry = await retrySend();
  assert.equal(firstRetry.status, 200);
  assert.equal(secondRetry.status, 200);
  assert.equal(
    (await firstRetry.json()).id,
    (await secondRetry.json()).id,
    'retry must return the same durable message',
  );
  const retryRows = await service
    .from('messages')
    .select('id')
    .eq('workspace_id', owner.workspaceId)
    .eq('client_id', retryId);
  assert.equal(retryRows.data?.length, 1, 'retry must not duplicate the row');
  for (let i = 0; i < 9; i++) {
    const sent = await fetch(`${app}/api/widget/messages`, {
      method: 'POST',
      headers: {
        'x-widget-key': widgetKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: `Rate test ${i}`, clientId: randomUUID() }),
    });
    assert.equal(sent.status, 200, `message ${i} should pass`);
  }
  const limited = await fetch(`${app}/api/widget/messages`, {
    method: 'POST',
    headers: {
      'x-widget-key': widgetKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ body: 'Rate test final', clientId: randomUUID() }),
  });
  assert.equal(limited.status, 429, 'flood must be rate limited');
  assert.equal(
    (await limited.json()).error,
    'You are sending messages too quickly. Try again in a minute.',
  );
  await frame.getByLabel('Your message').fill('Rate limit feedback');
  await frame.getByRole('button', { name: 'Send', exact: false }).click();
  await frame
    .getByText('You are sending messages too quickly. Try again in a minute.')
    .waitFor();
  const foreignRead = await outsider.client
    .from('messages')
    .select('id')
    .eq('workspace_id', owner.workspaceId);
  assert.deepEqual(
    foreignRead.data,
    [],
    'cross-workspace RLS must hide messages',
  );
  const foreignSession = await outsider.client
    .from('widget_sessions')
    .select('id');
  assert(
    foreignSession.error,
    'authenticated users must not read widget session tokens',
  );
  let foreignEvents = 0;
  const foreignChannel = outsider.client
    .channel(`p05-foreign-${randomUUID()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `workspace_id=eq.${owner.workspaceId}`,
      },
      () => {
        foreignEvents++;
      },
    );
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Foreign realtime subscription did not settle')),
      10000,
    );
    foreignChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED' || status === 'CHANNEL_ERROR') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  const privateMessage = await owner.client.rpc('send_message', {
    p_workspace_id: owner.workspaceId,
    p_conversation_id: sessionRow.data.conversation_id,
    p_body: 'Private team event',
    p_internal: false,
    p_client_id: randomUUID(),
  });
  assert.ifError(privateMessage.error);
  await new Promise((resolve) => setTimeout(resolve, 3000));
  assert.equal(
    foreignEvents,
    0,
    'foreign workspace realtime must not receive message',
  );
  await outsider.client.removeChannel(foreignChannel);
  const reduced = await browser.newPage({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await reduced.goto(host);
  const reducedFrame = reduced.frameLocator('iframe[title="Customer support"]');
  await reducedFrame.getByRole('button', { name: /Open .* support/ }).click();
  const duration = await reducedFrame
    .locator('.widget-panel')
    .evaluate((element) => getComputedStyle(element).animationDuration);
  assert.equal(
    duration,
    '1e-05s',
    'reduced motion removes spatial entrance animation',
  );
  await reduced.close();
  for (const width of [320, 360, 390, 768, 1024]) {
    await customer.setViewportSize({ width, height: 800 });
    await customer.reload();
    await frame.getByRole('button', { name: /Open .* support/ }).click();
    const bounds = await customer
      .locator('iframe[title="Customer support"]')
      .boundingBox();
    assert(
      bounds && bounds.x >= 0 && bounds.x + bounds.width <= width + 1,
      `widget within ${width}px viewport`,
    );
    assert.equal(
      await customer.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      `host overflow at ${width}`,
    );
    await frame.getByLabel('Your message').waitFor();
  }
  process.stdout.write(
    'P05 golden host → widget → inbox → reply → widget → reload and abuse checks passed.\n',
  );
} finally {
  if (owner) {
    await owner.client.removeAllChannels();
    owner.client.realtime.disconnect();
  }
  if (outsider) {
    await outsider.client.removeAllChannels();
    outsider.client.realtime.disconnect();
  }
  if (browser) await browser.close();
  if (hostProcess) hostProcess.kill();
  if (workspaceIds.length) {
    for (const table of [
      'widget_sessions',
      'messages',
      'conversations',
      'customer_identities',
      'customers',
      'audit_logs',
      'workspace_members',
    ])
      await service.from(table).delete().in('workspace_id', workspaceIds);
    await service.from('workspaces').delete().in('id', workspaceIds);
  }
  for (const id of users) await service.auth.admin.deleteUser(id);
}
