import { createClient } from '@supabase/supabase-js';
import { it, expect } from 'vitest';
import { fixture, checked } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U2-05 UP-U2-06: concurrent field patches preserve untouched data, uniqueness and current eligible assignment are enforced by RPCs',
  async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('u2-owner'),
        agent = await f.actor('u2-agent'),
        viewer = await f.actor('u2-viewer'),
        outsider = await f.actor('u2-outsider');
      const workspace = await f.workspace(owner);
      const foreignWorkspace = await f.workspace(outsider);
      for (const [actor, role] of [
        [agent, 'agent'],
        [viewer, 'viewer'],
      ] as const)
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: workspace,
            user_id: actor.id,
            status: 'active',
            role,
          }),
        );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'Original',
          p_email: 'first@example.invalid',
          p_phone: '1234',
          p_company: 'Original company',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'Duplicate',
          p_email: 'duplicate@example.invalid',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const conversation = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject: 'Human work',
          p_channel: 'manual',
        }),
      );
      const unnamed = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: '',
          p_email: 'unnamed@example.invalid',
          p_phone: 'x'.repeat(70),
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      checked(
        await owner.client.rpc('update_customer_fields', {
          p_workspace_id: workspace,
          p_customer_id: unnamed,
          p_changes: { company: 'Corrected optional company' },
        }),
      );
      expect(
        checked(
          await owner.client
            .from('customers')
            .select('name,company,phone')
            .eq('id', unnamed)
            .single(),
        ),
      ).toEqual({
        name: '',
        phone: 'x'.repeat(70),
        company: 'Corrected optional company',
      });
      const ticket = checked(
        await owner.client.rpc('create_ticket', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_conversation_id: conversation,
          p_title: 'Original ticket',
          p_description: 'Keep this description',
          p_priority: 'high',
          p_category: 'Keep category',
          p_assignee_user_id: agent.id,
        }),
      );
      const legacyTicket = checked(
        await owner.client.rpc('create_ticket', {
          p_workspace_id: workspace,
          p_title: 'Legacy category',
          p_description: '',
          p_priority: 'normal',
          p_category: 'x'.repeat(100),
          p_customer_id: null,
          p_conversation_id: null,
          p_assignee_user_id: null,
        }),
      );
      checked(
        await owner.client.rpc('update_ticket_fields', {
          p_workspace_id: workspace,
          p_ticket_id: legacyTicket,
          p_changes: { title: 'Corrected legacy title' },
        }),
      );
      expect(
        checked(
          await owner.client
            .from('tickets')
            .select('category')
            .eq('id', legacyTicket)
            .single(),
        ).category,
      ).toBe('x'.repeat(100));
      const anonymous = createClient(f.target.url, f.target.key, {
        auth: { persistSession: false },
      });
      expect(
        (
          await anonymous.rpc('update_customer_fields', {
            p_workspace_id: workspace,
            p_customer_id: customer,
            p_changes: { company: 'Denied' },
          })
        ).error,
      ).not.toBeNull();
      expect(
        (
          await outsider.client.rpc('update_customer_fields', {
            p_workspace_id: foreignWorkspace,
            p_customer_id: customer,
            p_changes: { company: 'Forged' },
          })
        ).error?.message,
      ).toContain('NOT_FOUND');
      expect(
        (
          await outsider.client.rpc('update_ticket_fields', {
            p_workspace_id: foreignWorkspace,
            p_ticket_id: ticket,
            p_changes: { title: 'Forged' },
          })
        ).error?.message,
      ).toContain('NOT_FOUND');
      for (const result of await Promise.all([
        owner.client.rpc('update_customer_fields', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_changes: { name: 'Corrected name' },
        }),
        agent.client.rpc('update_customer_fields', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_changes: { company: 'Corrected company' },
        }),
      ]))
        checked(result);
      expect(
        checked(
          await owner.client
            .from('customers')
            .select('name,email,phone,company')
            .eq('id', customer)
            .single(),
        ),
      ).toEqual({
        name: 'Corrected name',
        email: 'first@example.invalid',
        phone: '1234',
        company: 'Corrected company',
      });
      expect(
        (
          await owner.client.rpc('update_customer_fields', {
            p_workspace_id: workspace,
            p_customer_id: customer,
            p_changes: { email: 'DUPLICATE@example.invalid' },
          })
        ).error?.code,
      ).toBe('23505');
      for (const changes of [
        { email: 'bad-email' },
        { workspace_id: workspace },
        { phone: 'x'.repeat(61) },
      ])
        expect(
          (
            await owner.client.rpc('update_customer_fields', {
              p_workspace_id: workspace,
              p_customer_id: customer,
              p_changes: changes,
            })
          ).error,
        ).not.toBeNull();
      checked(
        await agent.client.rpc('update_ticket_fields', {
          p_workspace_id: workspace,
          p_ticket_id: ticket,
          p_changes: { title: 'Corrected ticket', category: '' },
        }),
      );
      expect(
        checked(
          await owner.client
            .from('tickets')
            .select(
              'title,description,priority,category,assignee_user_id,status',
            )
            .eq('id', ticket)
            .single(),
        ),
      ).toEqual({
        title: 'Corrected ticket',
        description: 'Keep this description',
        priority: 'high',
        category: null,
        assignee_user_id: agent.id,
        status: 'open',
      });
      for (const actor of [viewer, outsider]) {
        for (const [rpc, idField, id, changes] of [
          [
            'update_customer_fields',
            'p_customer_id',
            customer,
            { name: 'Denied' },
          ],
          ['update_ticket_fields', 'p_ticket_id', ticket, { title: 'Denied' }],
        ] as const)
          expect(
            (
              await actor.client.rpc(rpc, {
                p_workspace_id: workspace,
                [idField]: id,
                p_changes: changes,
              })
            ).error?.message,
          ).toContain('FORBIDDEN');
        expect(
          checked(
            await outsider.client
              .from('tickets')
              .select('id')
              .eq('workspace_id', workspace),
          ),
        ).toEqual([]);
      }
      for (const [kind, id] of [
        ['conversation', conversation],
        ['ticket', ticket],
      ]) {
        const args = {
          p_workspace_id: workspace,
          p_entity_type: kind,
          p_entity_id: id,
          p_status: null,
          p_priority: 'urgent',
          p_assignment: 'teammate',
          p_assignee_id: agent.id,
        };
        checked(await owner.client.rpc('update_support_routing', args));
        for (const target of [viewer.id, outsider.id])
          expect(
            (
              await owner.client.rpc('update_support_routing', {
                ...args,
                p_assignee_id: target,
              })
            ).error?.message,
          ).toContain('INVALID_ASSIGNEE');
        expect(
          (await viewer.client.rpc('update_support_routing', args)).error
            ?.message,
        ).toContain('FORBIDDEN');
        expect(
          (await outsider.client.rpc('update_support_routing', args)).error
            ?.message,
        ).toContain('FORBIDDEN');
        const table = kind === 'ticket' ? 'tickets' : 'conversations';
        const before = checked(
          await owner.client.from(table).select('*').eq('id', id).single(),
        );
        await Promise.all([
          agent.client
            .rpc('update_support_routing', {
              ...args,
              p_priority: 'high',
              p_assignment: 'keep',
              p_assignee_id: null,
            })
            .then(checked),
          owner.client
            .rpc('update_support_routing', {
              ...args,
              p_priority: null,
              p_status: 'pending',
              p_assignment: 'keep',
              p_assignee_id: null,
            })
            .then(checked),
        ]);
        expect(
          checked(
            await owner.client.from(table).select('*').eq('id', id).single(),
          ),
        ).toMatchObject({
          assignee_user_id: agent.id,
          status: 'pending',
          priority: 'high',
          ...(kind === 'ticket'
            ? { title: before.title, description: before.description }
            : {}),
        });
      }
      checked(
        await f.admin
          .from('workspace_members')
          .delete()
          .eq('workspace_id', workspace)
          .eq('user_id', agent.id),
      );
      expect(
        (
          await owner.client.rpc('update_support_routing', {
            p_workspace_id: workspace,
            p_entity_type: 'conversation',
            p_entity_id: conversation,
            p_status: null,
            p_priority: null,
            p_assignment: 'teammate',
            p_assignee_id: agent.id,
          })
        ).error?.message,
      ).toContain('INVALID_ASSIGNEE');
    } finally {
      await f.cleanup();
    }
  },
  120000,
);
