import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.P01_TEST_SUPABASE_URL;
const publishableKey = process.env.P01_TEST_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = process.env.P01_TEST_SUPABASE_SERVICE_ROLE_KEY;
const ready = Boolean(
  url &&
  /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(url) &&
  publishableKey &&
  serviceKey,
);

describe('P01 live tenant attacks', () => {
  it.skipIf(!ready)(
    'blocks cross-tenant access, escalation, invalid invites, and last-owner removal',
    async () => {
      const admin = createClient(url!, serviceKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const users: { id: string; email: string; password: string }[] = [];
      const workspaceIds: string[] = [];
      const run = randomUUID().slice(0, 8);
      const makeUser = async (label: string) => {
        const email = `p01-${label}-${run}@example.invalid`;
        const password = 'Test!' + randomBytes(24).toString('base64url');
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        expect(error).toBeNull();
        const user = { id: data.user!.id, email, password };
        users.push(user);
        const client = createClient(url!, publishableKey!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const signedIn = await client.auth.signInWithPassword({
          email,
          password,
        });
        expect(signedIn.error).toBeNull();
        return { ...user, client };
      };
      try {
        const a = await makeUser('a');
        const b = await makeUser('b');
        const viewer = await makeUser('viewer');
        const outsider = await makeUser('outsider');

        const aCreated = await a.client.rpc('create_workspace', {
          p_name: 'Tenant A',
          p_slug: `tenant-a-${run}`,
          p_timezone: 'UTC',
        });
        const bCreated = await b.client.rpc('create_workspace', {
          p_name: 'Tenant B',
          p_slug: `tenant-b-${run}`,
          p_timezone: 'UTC',
        });
        expect(aCreated.error).toBeNull();
        expect(bCreated.error).toBeNull();
        const aId = String(aCreated.data);
        const bId = String(bCreated.data);
        workspaceIds.push(aId, bId);

        expect(
          (await b.client.from('workspaces').select('id').eq('id', aId)).data,
        ).toEqual([]);
        expect(
          (await a.client.from('workspaces').select('id').eq('id', bId)).data,
        ).toEqual([]);
        expect(
          (
            await b.client
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', aId)
          ).data,
        ).toEqual([]);
        const forgedUpdate = await b.client
          .from('workspaces')
          .update({ name: 'Intrusion' })
          .eq('id', aId);
        expect(forgedUpdate.error).not.toBeNull();
        const forgedInvite = await b.client.rpc('create_invitation', {
          p_workspace_id: aId,
          p_email: outsider.email,
          p_role: 'admin',
          p_token_hash: randomBytes(32).toString('hex'),
        });
        expect(forgedInvite.error?.message).toContain('FORBIDDEN');
        expect(
          (
            await b.client.rpc('change_member_role', {
              p_workspace_id: aId,
              p_user_id: a.id,
              p_role: 'viewer',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await b.client.rpc('remove_member', {
              p_workspace_id: aId,
              p_user_id: a.id,
            })
          ).error?.message,
        ).toContain('FORBIDDEN');

        const viewerHash = randomBytes(32).toString('hex');
        const viewerInvite = await a.client.rpc('create_invitation', {
          p_workspace_id: aId,
          p_email: viewer.email,
          p_role: 'viewer',
          p_token_hash: viewerHash,
        });
        expect(viewerInvite.error).toBeNull();
        expect(
          (
            await viewer.client.rpc('accept_invitation', {
              p_token_hash: viewerHash,
            })
          ).data,
        ).toBe('accepted');
        expect(
          (
            await viewer.client.rpc('accept_invitation', {
              p_token_hash: viewerHash,
            })
          ).data,
        ).toBe('used');
        expect(
          (
            await viewer.client.rpc('change_member_role', {
              p_workspace_id: aId,
              p_user_id: viewer.id,
              p_role: 'owner',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await viewer.client
              .from('workspace_members')
              .update({ role: 'owner' })
              .eq('workspace_id', aId)
              .eq('user_id', viewer.id)
          ).error,
        ).not.toBeNull();
        expect(
          (
            await viewer.client.rpc('create_invitation', {
              p_workspace_id: bId,
              p_email: outsider.email,
              p_role: 'agent',
              p_token_hash: randomBytes(32).toString('hex'),
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await a.client.rpc('remove_member', {
              p_workspace_id: aId,
              p_user_id: a.id,
            })
          ).error?.message,
        ).toContain('LAST_OWNER');

        const revokedHash = randomBytes(32).toString('hex');
        const revoked = await a.client.rpc('create_invitation', {
          p_workspace_id: aId,
          p_email: outsider.email,
          p_role: 'agent',
          p_token_hash: revokedHash,
        });
        expect(revoked.error).toBeNull();
        expect(
          (await a.client.rpc('revoke_invitation', { p_id: revoked.data }))
            .error,
        ).toBeNull();
        expect(
          (
            await outsider.client.rpc('accept_invitation', {
              p_token_hash: revokedHash,
            })
          ).data,
        ).toBe('revoked');

        const expiredHash = randomBytes(32).toString('hex');
        const expired = await a.client.rpc('create_invitation', {
          p_workspace_id: aId,
          p_email: outsider.email,
          p_role: 'agent',
          p_token_hash: expiredHash,
        });
        expect(expired.error).toBeNull();
        const aged = await admin
          .from('workspace_invitations')
          .update({
            created_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
            expires_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
          })
          .eq('id', expired.data);
        expect(aged.error).toBeNull();
        expect(
          (
            await outsider.client.rpc('accept_invitation', {
              p_token_hash: expiredHash,
            })
          ).data,
        ).toBe('expired');
        const audits = await a.client
          .from('audit_logs')
          .select('action')
          .eq('workspace_id', aId);
        expect(audits.data?.some((row) => row.action === 'member.joined')).toBe(
          true,
        );
        expect(
          (
            await b.client
              .from('audit_logs')
              .select('id')
              .eq('workspace_id', aId)
          ).data,
        ).toEqual([]);
      } finally {
        if (workspaceIds.length) {
          await admin
            .from('audit_logs')
            .delete()
            .in('workspace_id', workspaceIds);
          await admin
            .from('workspace_invitations')
            .delete()
            .in('workspace_id', workspaceIds);
          await admin
            .from('workspace_members')
            .delete()
            .in('workspace_id', workspaceIds);
          await admin.from('workspaces').delete().in('id', workspaceIds);
        }
        for (const user of users) await admin.auth.admin.deleteUser(user.id);
      }
    },
    120_000,
  );
});
