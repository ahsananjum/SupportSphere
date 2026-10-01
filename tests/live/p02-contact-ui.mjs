// Explicit opt-in live verification. Remove the created QA submission after the run.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const email = process.env.P02_LIVE_TEST_EMAIL;
const projectRef = process.env.P02_LIVE_TEST_PROJECT_REF;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert(email, 'Set P02_LIVE_TEST_EMAIL to an owner-controlled address.');
assert(projectRef && supabaseUrl === `https://${projectRef}.supabase.co`);
assert(process.env.SUPABASE_SERVICE_ROLE_KEY);

const admin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const browser = await chromium.launch();
const marker = `P02 live UI verification ${randomUUID()}`;

try {
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3100/contact');
  await page
    .getByRole('textbox', { name: 'Your name' })
    .fill('SupportSphere QA');
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('textbox', { name: 'Message' }).fill(marker);
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.waitForURL('**/thank-you', { timeout: 30_000 });
  await page
    .getByRole('heading', { name: 'Thank you for reaching out.' })
    .waitFor();

  const { data, error } = await admin
    .from('contact_submissions')
    .select('id,delivery_status')
    .eq('message', marker)
    .single();
  assert.ifError(error);
  assert.equal(data.delivery_status, 'sent');
  console.log(
    `P02 contact UI, receipt, persistence, and Brevo acceptance passed. QA row: ${data.id}`,
  );
} finally {
  await browser.close();
}
