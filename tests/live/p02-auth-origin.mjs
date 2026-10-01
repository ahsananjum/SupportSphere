// Verifies the production OAuth entry without signing into a personal account.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.P02_PRODUCTION_ORIGIN;
const projectRef = process.env.P02_LIVE_TEST_PROJECT_REF;
assert(origin && new URL(origin).protocol === 'https:');
assert(projectRef);

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  let authorizeUrl;
  await page.route(
    `https://${projectRef}.supabase.co/auth/v1/authorize**`,
    (route) => {
      authorizeUrl = route.request().url();
      return route.fulfill({ status: 200, body: 'OAuth entry inspected.' });
    },
  );
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await page.waitForURL(
    `https://${projectRef}.supabase.co/auth/v1/authorize**`,
  );
  assert(authorizeUrl);
  const authorize = new URL(authorizeUrl);
  assert.equal(authorize.searchParams.get('provider'), 'google');
  assert.equal(
    authorize.searchParams.get('redirect_to'),
    `${origin}/auth/callback?next=%2Fapp`,
  );
  const providerResponse = await fetch(authorizeUrl, { redirect: 'manual' });
  assert.equal(providerResponse.status, 302);
  assert.match(
    providerResponse.headers.get('location') ?? '',
    /accounts\.google\.com/,
  );
  console.log(
    'P02 production Google OAuth initiates with the exact production callback.',
  );
} finally {
  await browser.close();
}
