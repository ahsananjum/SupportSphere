// Explicit opt-in live verification. The account is temporary and removed after the run.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = process.env.P01_LIVE_TEST_PROJECT_REF;
const email = process.env.P01_LIVE_TEST_EMAIL;
assert(url && ref && url === `https://${ref}.supabase.co`);
assert(email && email.includes('+supportsphere-p01-'));
assert(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.BREVO_API_KEY);

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const brevoHeaders = { 'api-key': process.env.BREVO_API_KEY };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function latestMail(subjectFragment) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const query = new URL('https://api.brevo.com/v3/smtp/emails');
    query.searchParams.set('email', email);
    query.searchParams.set('limit', '10');
    const response = await fetch(query, { headers: brevoHeaders });
    assert.equal(response.status, 200);
    const list = await response.json();
    const item = list.transactionalEmails?.find((entry) =>
      entry.subject?.toLowerCase().includes(subjectFragment),
    );
    if (item) {
      const detail = await fetch(
        `https://api.brevo.com/v3/smtp/emails/${encodeURIComponent(item.uuid)}`,
        { headers: brevoHeaders },
      );
      if (detail.status === 200) return detail.json();
      assert.equal(detail.status, 404);
    }
    await pause(2000);
  }
  throw new Error(`No ${subjectFragment} message appeared in Brevo`);
}

async function tokenLink(body, type) {
  const links = [...body.matchAll(/href=["']([^"']+)["']/gi)].map((match) =>
    match[1].replaceAll('&amp;', '&'),
  );
  assert.equal(links.length, 1, `Expected one ${type} link in delivered mail`);
  let link = links[0];
  let parsed = new URL(link);
  if (parsed.origin !== process.env.NEXT_PUBLIC_APP_URL) {
    assert.equal(parsed.protocol, 'https:');
    assert(/\.sendibt\d+\.com$/.test(parsed.hostname));
    const tracked = await fetch(link, { redirect: 'manual' });
    assert.equal(tracked.status, 302);
    link = tracked.headers.get('location');
    assert(link);
    parsed = new URL(link);
  }
  assert.equal(parsed.origin, process.env.NEXT_PUBLIC_APP_URL);
  assert.equal(parsed.pathname, '/auth/callback');
  assert(parsed.searchParams.has('token_hash'));
  assert.equal(parsed.searchParams.get('type'), type);
  return link;
}

const browser = await chromium.launch();
let createdId;
try {
  const signupContext = await browser.newContext();
  const signup = await signupContext.newPage();
  await signup.goto('http://127.0.0.1:3000/signup');
  await signup.getByLabel('Your name').fill('SupportSphere Mail Test');
  await signup.getByLabel('Email address').fill(email);
  await signup
    .getByLabel('Password', { exact: true })
    .fill('T!' + randomBytes(24).toString('base64url'));
  await signup.getByRole('button', { name: 'Create account' }).click();
  await signup
    .locator('.form-success, .form-error')
    .first()
    .waitFor({ timeout: 30000 });
  const signupError = (await signup.locator('.form-error').count())
    ? await signup.locator('.form-error').textContent()
    : null;
  if (signupError) throw new Error(`Signup UI: ${signupError}`);
  assert.match(
    await signup.locator('.form-success').innerText(),
    /Check your email/,
  );
  const confirmationMail = await latestMail('confirm');
  assert(confirmationMail.events?.some((event) => event.name === 'delivered'));
  const confirmationLink = await tokenLink(confirmationMail.body, 'email');

  // A separate browser context has none of the signup PKCE cookies.
  const confirmationContext = await browser.newContext();
  const confirmation = await confirmationContext.newPage();
  await confirmation.goto(confirmationLink);
  await confirmation.waitForURL(/\/app(?:\?|$)/, { timeout: 30000 });
  await confirmation
    .getByRole('heading', { name: 'Create your workspace' })
    .waitFor();
  const users = await admin.auth.admin.listUsers();
  assert.ifError(users.error);
  const created = users.data.users.find((user) => user.email === email);
  assert(created?.email_confirmed_at);
  createdId = created.id;

  await confirmation.getByRole('button', { name: 'Sign out' }).click();
  await confirmation.waitForURL(/\/login\?signed_out=1/);
  await confirmation.goto('http://127.0.0.1:3000/forgot-password');
  await confirmation.getByLabel('Email address').fill(email);
  await confirmation.getByRole('button', { name: 'Send reset link' }).click();
  await confirmation.getByText(/password reset link is on its way/).waitFor();
  const recoveryMail = await latestMail('reset');
  assert(recoveryMail.events?.some((event) => event.name === 'delivered'));
  const recoveryLink = await tokenLink(recoveryMail.body, 'recovery');

  const recoveryContext = await browser.newContext();
  const recovery = await recoveryContext.newPage();
  await recovery.goto(recoveryLink);
  await recovery
    .getByRole('heading', { name: 'Choose a new password' })
    .waitFor();
  for (const width of [320, 390, 768, 1440]) {
    await recovery.setViewportSize({ width, height: 900 });
    assert.equal(
      await recovery.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      false,
      `reset form overflow at ${width}px`,
    );
  }
  const passwordInput = recovery.getByLabel('New password', { exact: true });
  await passwordInput.focus();
  assert(
    await passwordInput.evaluate(
      (element) => element === document.activeElement,
    ),
  );
  const newPassword = 'T!' + randomBytes(24).toString('base64url');
  await passwordInput.fill(newPassword);
  await recovery
    .getByLabel('Confirm new password', { exact: true })
    .fill(newPassword);
  await recovery.getByRole('button', { name: 'Update password' }).click();
  await recovery.waitForURL(/\/login\?reset=success/, { timeout: 30000 });
  await recovery.getByLabel('Email address').fill(email);
  await recovery.getByLabel('Password', { exact: true }).fill(newPassword);
  await recovery.getByRole('button', { name: 'Sign in', exact: true }).click();
  await recovery.waitForURL(/\/app(?:\?|$)/, { timeout: 30000 });

  const reusedContext = await browser.newContext();
  const reused = await reusedContext.newPage();
  await reused.goto(recoveryLink);
  await reused
    .getByRole('heading', { name: 'Reset link unavailable' })
    .waitFor();
  console.log(
    JSON.stringify({
      confirmationDelivered: true,
      crossBrowserConfirmation: true,
      recoveryDelivered: true,
      crossBrowserRecovery: true,
      resetLogin: true,
      reusedLinkRejected: true,
      resetMobileAndFocus: true,
    }),
  );
} finally {
  await browser.close();
  if (!createdId) {
    const users = await admin.auth.admin.listUsers();
    createdId = users.data?.users.find((user) => user.email === email)?.id;
  }
  if (createdId) {
    const deleted = await admin.auth.admin.deleteUser(createdId);
    assert.ifError(deleted.error);
  }
}
