import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P03_LIVE_TEST_PROJECT_REF;
const ready = Boolean(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
);

describe('P03 live workspace boundaries', () => {
  it.skipIf(!ready)(
    'enforces onboarding, settings, notifications and removed-member access',
    async () => {
      const service = createClient(url!, secret!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const users: string[] = [];
      const workspaces: string[] = [];
      const run = randomUUID().slice(0, 8);
      async function actor(label: string) {
        const email = `p03-${label}-${run}@example.invalid`;
        const password = 'Test!' + randomBytes(24).toString('base64url');
        const created = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        expect(created.error).toBeNull();
        const id = created.data.user!.id;
        users.push(id);
        const client = createClient(url!, key!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        expect(
          (await client.auth.signInWithPassword({ email, password })).error,
        ).toBeNull();
        return { id, email, client };
      }
      async function invite(
        owner: Awaited<ReturnType<typeof actor>>,
        target: Awaited<ReturnType<typeof actor>>,
        workspaceId: string,
        role: string,
      ) {
        const hash = randomBytes(32).toString('hex');
        expect(
          (
            await owner.client.rpc('create_invitation', {
              p_workspace_id: workspaceId,
              p_email: target.email,
              p_role: role,
              p_token_hash: hash,
            })
          ).error,
        ).toBeNull();
        expect(
          (await target.client.rpc('accept_invitation', { p_token_hash: hash }))
            .data,
        ).toBe('accepted');
      }
      const settings = (id: string, suffix = '') => ({
        p_workspace_id: id,
        p_name: 'P03 Workspace' + suffix,
        p_slug: `p03-${run}${suffix}`,
        p_timezone: 'UTC',
        p_company_name: 'Support Company',
        p_support_name: 'Support Team',
        p_support_email: 'help@example.com',
        p_website_origin: '',
      });
      try {
        const owner = await actor('owner');
        const secondOwner = await actor('other');
        const viewer = await actor('viewer');
        const admin = await actor('admin');
        const agent = await actor('agent');
        const made = await owner.client.rpc('create_workspace', {
          p_name: 'P03 Workspace',
          p_slug: `p03-${run}`,
          p_timezone: 'UTC',
        });
        const otherMade = await secondOwner.client.rpc('create_workspace', {
          p_name: 'Other Workspace',
          p_slug: `p03-other-${run}`,
          p_timezone: 'UTC',
        });
        expect(made.error).toBeNull();
        expect(otherMade.error).toBeNull();
        const id = String(made.data);
        const otherId = String(otherMade.data);
        workspaces.push(id, otherId);
        await invite(owner, viewer, id, 'viewer');
        await invite(owner, admin, id, 'admin');
        await invite(owner, agent, id, 'agent');
        expect(
          (
            await viewer.client.rpc('remove_member', {
              p_workspace_id: id,
              p_user_id: viewer.id,
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await agent.client.rpc('remove_member', {
              p_workspace_id: id,
              p_user_id: agent.id,
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (await viewer.client.rpc('update_workspace_general', settings(id)))
            .error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (await agent.client.rpc('update_workspace_general', settings(id)))
            .error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await admin.client.rpc(
              'update_workspace_general',
              settings(otherId),
            )
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await secondOwner.client.rpc('advance_onboarding', {
              p_workspace_id: id,
              p_expected: 'identity',
              p_next: 'origin',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await viewer.client
              .from('workspaces')
              .update({ name: 'Forged' })
              .eq('id', id)
          ).error,
        ).not.toBeNull();
        expect(
          (
            await owner.client.rpc('advance_onboarding', {
              p_workspace_id: id,
              p_expected: 'identity',
              p_next: 'ai',
            })
          ).error?.message,
        ).toContain('INVALID_STEP');
        expect(
          (
            await owner.client.rpc('advance_onboarding', {
              p_workspace_id: id,
              p_expected: 'identity',
              p_next: 'origin',
            })
          ).error?.message,
        ).toContain('IDENTITY_REQUIRED');
        expect(
          (await owner.client.rpc('update_workspace_general', settings(id)))
            .error,
        ).toBeNull();
        expect(
          (await admin.client.rpc('update_workspace_general', settings(id)))
            .error,
        ).toBeNull();
        expect(
          (
            await owner.client.rpc('advance_onboarding', {
              p_workspace_id: id,
              p_expected: 'identity',
              p_next: 'origin',
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await admin.client.rpc('advance_onboarding', {
              p_workspace_id: id,
              p_expected: 'origin',
              p_next: 'team',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        for (const [from, to] of [
          ['origin', 'team'],
          ['team', 'knowledge'],
          ['knowledge', 'ai'],
        ])
          expect(
            (
              await owner.client.rpc('advance_onboarding', {
                p_workspace_id: id,
                p_expected: from,
                p_next: to,
              })
            ).error,
          ).toBeNull();
        expect(
          (
            await viewer.client.rpc('finish_onboarding', {
              p_workspace_id: id,
              p_ai_mode: 'assisted',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await admin.client.rpc('finish_onboarding', {
              p_workspace_id: id,
              p_ai_mode: 'assisted',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await owner.client.rpc('finish_onboarding', {
              p_workspace_id: id,
              p_ai_mode: 'draft_only',
            })
          ).error,
        ).toBeNull();
        const workspace = await owner.client
          .from('workspaces')
          .select('onboarding_step,onboarding_completed_at,ai_mode')
          .eq('id', id)
          .single();
        expect(workspace.data?.onboarding_step).toBe('complete');
        expect(workspace.data?.onboarding_completed_at).toBeTruthy();
        expect(workspace.data?.ai_mode).toBe('draft_only');
        expect(
          (
            await owner.client.rpc('update_workspace_general', {
              ...settings(id),
              p_company_name: '',
            })
          ).error,
        ).not.toBeNull();
        const mine = await owner.client
          .from('notifications')
          .select('id,read_at')
          .eq('workspace_id', id);
        expect(mine.data?.length).toBe(1);
        const notificationId = mine.data![0].id;
        const viewerNotice = await service
          .from('notifications')
          .insert({
            workspace_id: id,
            user_id: viewer.id,
            kind: 'member_joined',
            title: 'Test membership notice',
            body: 'A test notification for permission verification.',
          })
          .select('id')
          .single();
        expect(viewerNotice.error).toBeNull();
        expect(
          (
            await viewer.client
              .from('notifications')
              .select('id')
              .eq('id', viewerNotice.data!.id)
          ).data?.length,
        ).toBe(1);
        expect(
          (
            await viewer.client.rpc('mark_notification_read', {
              p_id: viewerNotice.data!.id,
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await viewer.client
              .from('notifications')
              .select('id')
              .eq('id', notificationId)
          ).data,
        ).toEqual([]);
        expect(
          (
            await viewer.client.rpc('mark_notification_read', {
              p_id: notificationId,
            })
          ).error?.message,
        ).toContain('NOT_FOUND');
        expect(
          (
            await owner.client.rpc('mark_notification_read', {
              p_id: notificationId,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await owner.client
              .from('notifications')
              .select('read_at')
              .eq('id', notificationId)
              .single()
          ).data?.read_at,
        ).toBeTruthy();
        expect(
          (
            await owner.client.rpc('remove_member', {
              p_workspace_id: id,
              p_user_id: viewer.id,
            })
          ).error,
        ).toBeNull();
        expect(
          (await viewer.client.from('workspaces').select('id').eq('id', id))
            .data,
        ).toEqual([]);
        expect(
          (await viewer.client.rpc('update_workspace_general', settings(id)))
            .error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await viewer.client
              .from('workspace_members')
              .select('user_id')
              .eq('workspace_id', id)
          ).data,
        ).toEqual([]);
      } finally {
        if (workspaces.length) {
          await service
            .from('audit_logs')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('notifications')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('workspace_invitations')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('workspace_members')
            .delete()
            .in('workspace_id', workspaces);
          await service.from('workspaces').delete().in('id', workspaces);
        }
        for (const id of users) await service.auth.admin.deleteUser(id);
      }
    },
    120_000,
  );
});
