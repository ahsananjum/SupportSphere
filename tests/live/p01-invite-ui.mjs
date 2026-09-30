// Explicit opt-in live invitation UI verification against one known test workspace.
import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from '@playwright/test';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ref = process.env.P01_LIVE_TEST_PROJECT_REF;
const ownerEmail = process.env.P01_LIVE_TEST_OWNER_EMAIL;
const workspaceSlug = process.env.P01_LIVE_TEST_WORKSPACE_SLUG;
assert(url && ref && url === `https://${ref}.supabase.co`);
assert(ownerEmail?.includes('+supportsphere-p01@'));
assert(workspaceSlug?.startsWith('p01-live-'));

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const owner = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
const users = await admin.auth.admin.listUsers();
assert.ifError(users.error);
const ownerUser = users.data.users.find((user) => user.email === ownerEmail);
assert(ownerUser);
const password = 'T!' + randomBytes(24).toString('base64url');
assert.ifError(
  (await admin.auth.admin.updateUserById(ownerUser.id, { password })).error,
);
assert.ifError(
  (await owner.auth.signInWithPassword({ email: ownerEmail, password })).error,
);
const workspaceResult = await admin
  .from('workspaces')
  .select('id')
  .eq('slug', workspaceSlug)
  .single();
assert.ifError(workspaceResult.error);
const workspaceId = workspaceResult.data.id;
const run = randomUUID().slice(0, 8);
const createdInvites = [];
let usedUserId;
const browser = await chromium.launch();

function tokenPair() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
}

async function invite(label, email) {
  const pair = tokenPair();
  const result = await owner.rpc('create_invitation', {
    p_workspace_id: workspaceId,
    p_email: email,
    p_role: 'viewer',
    p_token_hash: pair.hash,
  });
  assert.ifError(result.error);
  createdInvites.push(result.data);
  return { ...pair, id: result.data };
}

try {
  const memberInvite = await owner.rpc('create_invitation', {
    p_workspace_id: workspaceId,
    p_email: ownerEmail,
    p_role: 'viewer',
    p_token_hash: tokenPair().hash,
  });
  assert.match(memberInvite.error?.message ?? '', /ALREADY_MEMBER/);

  const active = await invite('active', `p01-ui-active-${run}@example.invalid`);
  const page = await browser.newPage();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:3000/invite/${active.token}`);
    await page
      .getByRole('heading', { name: 'Join P01 Verification Workspace' })
      .waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
      ),
      false,
      `active invitation overflow at ${width}px`,
    );
  }
  assert.ifError(
    (await owner.rpc('revoke_invitation', { p_id: active.id })).error,
  );
  await page.reload();
  await page.getByText('This invitation was revoked.').waitFor();

  const expired = await invite(
    'expired',
    `p01-ui-expired-${run}@example.invalid`,
  );
  const aged = await admin
    .from('workspace_invitations')
    .update({
      created_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      expires_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    })
    .eq('id', expired.id);
  assert.ifError(aged.error);
  await page.goto(`http://127.0.0.1:3000/invite/${expired.token}`);
  await page.getByText('This invitation has expired.').waitFor();
  const renewed = tokenPair();
  assert.ifError(
    (
      await owner.rpc('resend_invitation', {
        p_id: expired.id,
        p_token_hash: renewed.hash,
      })
    ).error,
  );
  await page.goto(`http://127.0.0.1:3000/invite/${expired.token}`);
  await page.getByText('This invitation link is invalid.').waitFor();
  await page.goto(`http://127.0.0.1:3000/invite/${renewed.token}`);
  await page
    .getByRole('heading', { name: 'Join P01 Verification Workspace' })
    .waitFor();

  const usedEmail = `p01-ui-used-${run}@example.invalid`;
  const used = await invite('used', usedEmail);
  const created = await admin.auth.admin.createUser({
    email: usedEmail,
    password: 'T!' + randomBytes(24).toString('base64url'),
    email_confirm: true,
  });
  assert.ifError(created.error);
  usedUserId = created.data.user.id;
  const usedClient = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const testPassword = 'T!' + randomBytes(24).toString('base64url');
  assert.ifError(
    (
      await admin.auth.admin.updateUserById(usedUserId, {
        password: testPassword,
      })
    ).error,
  );
  assert.ifError(
    (
      await usedClient.auth.signInWithPassword({
        email: usedEmail,
        password: testPassword,
      })
    ).error,
  );
  assert.equal(
    (await usedClient.rpc('accept_invitation', { p_token_hash: used.hash }))
      .data,
    'accepted',
  );
  await page.goto(`http://127.0.0.1:3000/invite/${used.token}`);
  await page.getByText('This invitation has already been used.').waitFor();
  console.log(
    JSON.stringify({
      alreadyMemberRejected: true,
      activeMobile: true,
      revokedState: true,
      expiredState: true,
      resendRotatesToken: true,
      usedState: true,
    }),
  );
} finally {
  await browser.close();
  const targets = [...createdInvites, ...(usedUserId ? [usedUserId] : [])];
  if (targets.length)
    assert.ifError(
      (
        await admin
          .from('audit_logs')
          .delete()
          .eq('workspace_id', workspaceId)
          .in('target_id', targets)
      ).error,
    );
  if (createdInvites.length)
    assert.ifError(
      (
        await admin
          .from('workspace_invitations')
          .delete()
          .in('id', createdInvites)
      ).error,
    );
  if (usedUserId)
    assert.ifError((await admin.auth.admin.deleteUser(usedUserId)).error);
}
