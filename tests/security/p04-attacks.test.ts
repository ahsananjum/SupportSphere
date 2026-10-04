import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ref = process.env.P04_LIVE_TEST_PROJECT_REF;
const ready = Boolean(
  url && key && secret && ref && url === `https://${ref}.supabase.co`,
);

describe('P04 live support operation boundaries', () => {
  it.skipIf(!ready)(
    'isolates support records, dedupes customers, and serializes tickets',
    async () => {
      const service = createClient(url!, secret!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const users: string[] = [];
      const workspaces: string[] = [];
      const run = randomUUID().slice(0, 8);
      async function actor(label: string) {
        const email = `p04-${label}-${run}@example.invalid`;
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
      try {
        const owner = await actor('owner');
        const other = await actor('other');
        const agent = await actor('agent');
        const viewer = await actor('viewer');
        const outsider = await actor('outsider');
        const first = await owner.client.rpc('create_workspace', {
          p_name: 'P04 Support',
          p_slug: `p04-${run}`,
          p_timezone: 'UTC',
        });
        const second = await other.client.rpc('create_workspace', {
          p_name: 'P04 Other',
          p_slug: `p04-other-${run}`,
          p_timezone: 'UTC',
        });
        expect(first.error).toBeNull();
        expect(second.error).toBeNull();
        const workspaceId = String(first.data);
        const otherWorkspaceId = String(second.data);
        workspaces.push(workspaceId, otherWorkspaceId);
        await invite(owner, agent, workspaceId, 'agent');
        await invite(owner, viewer, workspaceId, 'viewer');

        const customerCalls = await Promise.all(
          Array.from({ length: 4 }, () =>
            owner.client.rpc('create_or_get_customer', {
              p_workspace_id: workspaceId,
              p_name: 'Ada Lovelace',
              p_email: 'ada@example.com',
              p_phone: '',
              p_company: 'Analytical Engines',
              p_provider: 'email',
              p_identity_key: 'ada@example.com',
            }),
          ),
        );
        customerCalls.forEach((result) => expect(result.error).toBeNull());
        const customerIds = new Set(
          customerCalls.map((result) => String(result.data)),
        );
        expect(customerIds.size).toBe(1);
        const customerId = String(customerCalls[0].data);

        expect(
          (
            await viewer.client.rpc('create_or_get_customer', {
              p_workspace_id: workspaceId,
              p_name: 'Blocked',
              p_email: 'blocked@example.com',
              p_phone: '',
              p_company: '',
              p_provider: 'email',
              p_identity_key: 'blocked@example.com',
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        expect(
          (
            await other.client
              .from('customers')
              .select('id')
              .eq('workspace_id', workspaceId)
          ).data,
        ).toEqual([]);
        expect(
          (
            await outsider.client
              .from('customers')
              .select('id')
              .eq('workspace_id', workspaceId)
          ).data,
        ).toEqual([]);
        expect(
          (
            await other.client.rpc('create_conversation', {
              p_workspace_id: otherWorkspaceId,
              p_customer_id: customerId,
              p_subject: 'Forged',
              p_channel: 'manual',
            })
          ).error?.message,
        ).toContain('INVALID_INPUT');

        const conversation = await owner.client.rpc('create_conversation', {
          p_workspace_id: workspaceId,
          p_customer_id: customerId,
          p_subject: 'Account question',
          p_channel: 'manual',
        });
        expect(conversation.error).toBeNull();
        const conversationId = String(conversation.data);
        expect(
          (
            await viewer.client.rpc('send_message', {
              p_workspace_id: workspaceId,
              p_conversation_id: conversationId,
              p_body: 'blocked',
              p_internal: false,
              p_client_id: randomUUID(),
            })
          ).error?.message,
        ).toContain('FORBIDDEN');
        const clientId = randomUUID();
        const sent = await agent.client.rpc('send_message', {
          p_workspace_id: workspaceId,
          p_conversation_id: conversationId,
          p_body: 'Hello from the support team.',
          p_internal: false,
          p_client_id: clientId,
        });
        expect(sent.error).toBeNull();
        const retried = await agent.client.rpc('send_message', {
          p_workspace_id: workspaceId,
          p_conversation_id: conversationId,
          p_body: 'Hello from the support team.',
          p_internal: false,
          p_client_id: clientId,
        });
        expect(retried.error).toBeNull();
        expect(retried.data).toBe(sent.data);
        expect(
          (
            await agent.client.rpc('send_message', {
              p_workspace_id: workspaceId,
              p_conversation_id: conversationId,
              p_body: 'Internal routing note.',
              p_internal: true,
              p_client_id: randomUUID(),
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await service
              .from('messages')
              .select('id,sender_type')
              .eq('conversation_id', conversationId)
          ).data?.length,
        ).toBe(2);

        const conversationUpdates = await Promise.all([
          owner.client.rpc('update_conversation', {
            p_workspace_id: workspaceId,
            p_conversation_id: conversationId,
            p_status: 'pending',
            p_priority: 'high',
            p_assignee_user_id: agent.id,
          }),
          agent.client.rpc('update_conversation', {
            p_workspace_id: workspaceId,
            p_conversation_id: conversationId,
            p_status: 'open',
            p_priority: 'normal',
            p_assignee_user_id: agent.id,
          }),
        ]);
        conversationUpdates.forEach((result) =>
          expect(result.error).toBeNull(),
        );

        const ticketResults = await Promise.all(
          Array.from({ length: 8 }, (_, index) =>
            owner.client.rpc('create_ticket', {
              p_workspace_id: workspaceId,
              p_title: `Concurrent ticket ${index}`,
              p_description: 'Race test',
              p_priority: 'normal',
              p_category: 'test',
              p_customer_id: customerId,
              p_conversation_id: conversationId,
              p_assignee_user_id: agent.id,
            }),
          ),
        );
        ticketResults.forEach((result) => expect(result.error).toBeNull());
        const ticketIds = ticketResults.map((result) => String(result.data));
        const ticketRows = await service
          .from('tickets')
          .select('id,ticket_number')
          .in('id', ticketIds)
          .order('ticket_number');
        expect(ticketRows.error).toBeNull();
        expect(ticketRows.data?.map((row) => row.ticket_number)).toEqual([
          1, 2, 3, 4, 5, 6, 7, 8,
        ]);
        const concurrentTicketUpdates = await Promise.all([
          agent.client.rpc('update_ticket', {
            p_workspace_id: workspaceId,
            p_ticket_id: ticketIds[0],
            p_status: 'in_progress',
            p_priority: 'high',
            p_category: null,
            p_assignee_user_id: agent.id,
            p_title: null,
            p_description: null,
          }),
          agent.client.rpc('update_ticket', {
            p_workspace_id: workspaceId,
            p_ticket_id: ticketIds[0],
            p_status: 'pending',
            p_priority: 'normal',
            p_category: null,
            p_assignee_user_id: agent.id,
            p_title: null,
            p_description: null,
          }),
        ]);
        concurrentTicketUpdates.forEach((result) =>
          expect(result.error).toBeNull(),
        );
        expect(
          (
            await agent.client.rpc('update_ticket', {
              p_workspace_id: workspaceId,
              p_ticket_id: ticketIds[0],
              p_status: 'in_progress',
              p_priority: 'high',
              p_category: null,
              p_assignee_user_id: outsider.id,
              p_title: null,
              p_description: null,
            })
          ).error?.message,
        ).toContain('INVALID_INPUT');
        expect(
          (
            await agent.client.rpc('update_ticket', {
              p_workspace_id: workspaceId,
              p_ticket_id: ticketIds[0],
              p_status: 'resolved',
              p_priority: null,
              p_category: null,
              p_assignee_user_id: agent.id,
              p_title: null,
              p_description: null,
            })
          ).error,
        ).toBeNull();
        expect(
          (
            await service
              .from('ticket_events')
              .select('event_type')
              .eq('ticket_id', ticketIds[0])
          ).data?.map((row) => row.event_type),
        ).toEqual(['created', 'updated', 'updated', 'updated']);
        expect(
          (
            await other.client
              .from('tickets')
              .select('id')
              .eq('workspace_id', workspaceId)
          ).data,
        ).toEqual([]);
      } finally {
        if (workspaces.length) {
          await service
            .from('ticket_events')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('messages')
            .delete()
            .in('workspace_id', workspaces);
          await service.from('tickets').delete().in('workspace_id', workspaces);
          await service
            .from('conversations')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('customer_identities')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('customers')
            .delete()
            .in('workspace_id', workspaces);
          await service
            .from('audit_logs')
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
