import { it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { fixture, checked, localSql } from './fixture';

const sqlAsync = (sql: string) =>
  new Promise<void>((resolve, reject) =>
    execFile(
      'docker',
      [
        'exec',
        'supabase_db_supportsphere-u0-local',
        'psql',
        '-U',
        'supabase_admin',
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
        '-At',
        '-c',
        sql,
      ],
      { timeout: 30000, windowsHide: true },
      (error) => (error ? reject(error) : resolve()),
    ),
  );

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U2-09: pending effects respect newer human work, serialize races and consume duplicate action retries once',
  async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('override-owner'),
        agent = await f.actor('override-agent'),
        workspace = await f.workspace(owner);
      checked(
        await f.admin.from('workspace_members').insert({
          workspace_id: workspace,
          user_id: agent.id,
          role: 'agent',
          status: 'active',
        }),
      );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'Override customer',
          p_email: 'override@example.invalid',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const rule = checked(
        await f.admin
          .from('automation_rules')
          .insert({
            workspace_id: workspace,
            name: 'U2 routing rule',
            trigger_type: 'conversation_created',
            conditions: {},
            actions: [{ type: 'set_priority', value: 'urgent' }],
            enabled: true,
          })
          .select('id')
          .single(),
      );
      const conversation = async () =>
        checked(
          await owner.client.rpc('create_conversation', {
            p_workspace_id: workspace,
            p_customer_id: customer,
            p_subject: 'Override race',
            p_channel: 'manual',
          }),
        ) as string;
      const manual = async (id: string) =>
        checked(
          await owner.client.rpc('update_support_routing', {
            p_workspace_id: workspace,
            p_entity_type: 'conversation',
            p_entity_id: id,
            p_status: 'pending',
            p_priority: 'high',
            p_assignment: 'teammate',
            p_assignee_id: agent.id,
          }),
        );
      for (let n = 0; n < 4; n++) {
        const id = await conversation();
        if (n === 0) {
          await manual(id);
          localSql('select app_private.process_automation_runs(100);');
        } else
          await Promise.all([
            manual(id),
            sqlAsync('select app_private.process_automation_runs(100);'),
          ]);
        expect(
          checked(
            await owner.client
              .from('conversations')
              .select('priority,status,assignee_user_id')
              .eq('id', id)
              .single(),
          ),
        ).toEqual({
          priority: 'high',
          status: 'pending',
          assignee_user_id: agent.id,
        });
        const run = checked(
          await f.admin
            .from('automation_runs')
            .select('status,result')
            .eq('trigger_entity_id', id)
            .single(),
        );
        if (n === 0)
          expect(run).toMatchObject({
            status: 'skipped',
            result: { reason: 'HUMAN_OVERRIDE' },
          });
        else expect(['skipped', 'succeeded']).toContain(run.status);
      }
      checked(
        await f.admin
          .from('automation_rules')
          .update({
            actions: [
              {
                type: 'create_ticket',
                title: 'Exactly once',
                description: 'Synthetic',
                priority: 'normal',
              },
              { type: 'set_priority', value: 'urgent' },
            ],
          })
          .eq('id', rule.id),
      );
      const once = await conversation(),
        lease = checked(await f.admin.rpc('claim_automation_run'))[0];
      const action = {
        p_workspace_id: workspace,
        p_entity_type: 'conversation',
        p_entity_id: once,
        p_action_type: 'create_ticket',
        p_params: {
          type: 'create_ticket',
          title: 'Exactly once',
          description: 'Synthetic',
          priority: 'normal',
          _automation_run_id: lease.id,
          _action_index: 0,
          _lease_token: lease.lease_token,
        },
      };
      for (const result of await Promise.all([
        f.admin.rpc('apply_automation_action', action),
        f.admin.rpc('apply_automation_action', action),
      ]))
        checked(result);
      expect(
        checked(
          await owner.client
            .from('tickets')
            .select('id')
            .eq('conversation_id', once),
        ),
      ).toHaveLength(1);
      expect(
        (
          await f.admin.rpc('apply_automation_action', {
            ...action,
            p_params: { ...action.p_params, _lease_token: randomUUID() },
          })
        ).error?.message,
      ).toContain('LEASE_EXPIRED');
      await manual(once);
      expect(
        (
          await f.admin.rpc('apply_automation_action', {
            ...action,
            p_action_type: 'set_priority',
            p_params: { ...action.p_params, _action_index: 1, value: 'urgent' },
          })
        ).error?.message,
      ).toContain('HUMAN_OVERRIDE');
      checked(
        await f.admin.rpc('finish_automation_run', {
          p_run_id: lease.id,
          p_lease_token: lease.lease_token,
          p_result: {
            status: 'skipped',
            reason: 'HUMAN_OVERRIDE',
            actionsApplied: 1,
          },
        }),
      );
      expect(
        (await f.admin.rpc('apply_automation_action', action)).error?.message,
      ).toContain('LEASE_EXPIRED');
      checked(
        await f.admin
          .from('automation_rules')
          .update({ enabled: false })
          .eq('id', rule.id),
      );

      checked(
        await f.admin
          .from('ai_agent_configs')
          .update({ mode: 'assisted' })
          .eq('workspace_id', workspace),
      );
      const policy = checked(
        await f.admin
          .from('ai_agent_configs')
          .select('version')
          .eq('workspace_id', workspace)
          .single(),
      );
      const source = checked(
        await f.admin
          .from('knowledge_sources')
          .insert({
            workspace_id: workspace,
            name: 'U2 synthetic evidence',
            source_type: 'paste',
            input_text: 'Approved answer',
            status: 'ready',
            enabled: true,
          })
          .select('id')
          .single(),
      );
      const document = checked(
        await f.admin
          .from('knowledge_documents')
          .insert({
            workspace_id: workspace,
            source_id: source.id,
            document_index: 0,
            title: 'Evidence',
            content: 'Approved answer',
          })
          .select('id')
          .single(),
      );
      const chunk = checked(
        await f.admin
          .from('knowledge_chunks')
          .insert({
            workspace_id: workspace,
            source_id: source.id,
            document_id: document.id,
            chunk_index: 0,
            content: 'Approved answer',
            token_count: 2,
            embedding: JSON.stringify([1, ...Array(383).fill(0)]),
          })
          .select('id')
          .single(),
      );
      const finish = async (run: { id: string; lease_token: string }) =>
        f.admin.rpc('finish_ai_run', {
          p_run_id: run.id,
          p_lease_token: run.lease_token,
          p_provider: 'controlled-local',
          p_model: 'u2-gate',
          p_triage: { intent: 'how_to', escalate: false },
          p_quality: {
            passed: true,
            grounded: true,
            safe: true,
            tone_ok: true,
          },
          p_output: 'Approved answer [1].',
          p_confidence: 1,
          p_evidence: 1,
          p_requested_decision: 'auto_sent',
          p_reason: 'POLICY_PASS',
          p_steps: [],
          p_citations: [
            {
              source_id: source.id,
              chunk_id: chunk.id,
              ordinal: 1,
              score: 1,
              snippet: 'Approved answer',
            },
          ],
          p_input_tokens: 1,
          p_output_tokens: 1,
          p_latency_ms: 1,
        });
      for (const change of [
        'assignment',
        'note',
        'reply',
        'input',
        'handoff',
        'none',
        'failure',
      ]) {
        const id = await conversation();
        checked(
          await f.admin.from('messages').insert({
            workspace_id: workspace,
            conversation_id: id,
            sender_type: 'customer',
            body: 'How does this work?',
          }),
        );
        const run = checked(await f.admin.rpc('claim_ai_run')) as {
          id: string;
          lease_token: string;
          conversation_id: string;
        };
        expect(run.conversation_id).toBe(id);
        if (change === 'assignment' || change === 'failure') await manual(id);
        if (change === 'note' || change === 'reply') {
          const args = {
            p_workspace_id: workspace,
            p_conversation_id: id,
            p_body: 'Human work wins',
            p_internal: change === 'note',
            p_client_id: randomUUID(),
          };
          const first = checked(await owner.client.rpc('send_message', args));
          expect(checked(await owner.client.rpc('send_message', args))).toBe(
            first,
          );
        }
        if (change === 'input')
          checked(
            await f.admin.from('messages').insert({
              workspace_id: workspace,
              conversation_id: id,
              sender_type: 'customer',
              body: 'Newer input',
            }),
          );
        if (change === 'handoff')
          checked(
            await f.admin
              .from('conversations')
              .update({
                ai_handoff_at: new Date().toISOString(),
                ai_handoff_reason: 'Human review latch',
              })
              .eq('id', id),
          );
        if (change === 'failure') {
          checked(
            await f.admin.rpc('fail_ai_run', {
              p_run_id: run.id,
              p_lease_token: run.lease_token,
              p_error_code: 'CONTROLLED_FAILURE',
              p_retry: false,
            }),
          );
          expect(
            checked(
              await owner.client
                .from('conversations')
                .select('ai_handoff_at')
                .eq('id', id)
                .single(),
            ).ai_handoff_at,
          ).toBeNull();
        } else {
          expect(checked(await finish(run))).toBe(
            change === 'none' ? 'auto_sent' : 'skipped',
          );
          expect((await finish(run)).error?.message).toContain('LEASE_EXPIRED');
        }
        const result = checked(
          await f.admin
            .from('ai_runs')
            .select('status,reason_code,policy_version')
            .eq('id', run.id)
            .single(),
        );
        expect(result.policy_version).toBe(policy.version);
        if (change !== 'none')
          expect(result.reason_code).toBe('HUMAN_OVERRIDE');
        expect(
          checked(
            await owner.client
              .from('messages')
              .select('id')
              .eq('conversation_id', id)
              .eq('client_id', `ai:${run.id}`),
          ),
        ).toHaveLength(change === 'none' ? 1 : 0);
        checked(
          await f.admin
            .from('ai_runs')
            .update({
              status: 'skipped',
              decision: 'skipped',
              reason_code: 'TEST_CLEANUP',
            })
            .eq('workspace_id', workspace)
            .eq('status', 'queued'),
        );
      }
    } finally {
      await f.cleanup();
    }
  },
  150000,
);
