import { describe, expect, it } from 'vitest';
import { fixture, checked, localSql } from './fixture';
import { getAnalytics } from '../../lib/analytics/queries';
import {
  createAiProcessor,
  type Job,
} from '../../supabase/functions/_shared/ai-processor';

const ready = process.env.RUN_UPGRADE_LOCAL === '1';

it.skipIf(!ready)(
  'UP-U0-04: real paged metric cohorts include earlier history and resolved tickets',
  async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('metrics'),
        outsider = await f.actor('metrics-other');
      const w = await f.workspace(owner),
        foreign = await f.workspace(outsider);
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: w,
          p_name: 'Metric customer',
          p_email: '',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const c = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: w,
          p_customer_id: customer,
          p_subject: 'Older metric conversation',
          p_channel: 'manual',
        }),
      );
      checked(
        await f.admin
          .from('conversations')
          .update({ created_at: '2026-01-01T00:00:00Z' })
          .eq('id', c),
      );
      checked(
        await f.admin.from('messages').insert([
          {
            workspace_id: w,
            conversation_id: c,
            sender_type: 'customer',
            body: 'Old input',
            created_at: '2026-01-01T23:50:00Z',
          },
          {
            workspace_id: w,
            conversation_id: c,
            sender_type: 'agent',
            body: 'First reply',
            sender_user_id: owner.id,
            created_at: '2026-01-02T00:10:00Z',
          },
          {
            workspace_id: w,
            conversation_id: c,
            sender_type: 'agent',
            body: 'Later reply',
            sender_user_id: owner.id,
            created_at: '2026-01-02T00:30:00Z',
          },
        ]),
      );
      checked(
        await f.admin.from('tickets').insert({
          workspace_id: w,
          ticket_number: 1,
          title: 'Older resolved ticket',
          created_at: '2026-01-01T00:00:00Z',
          resolved_at: '2026-01-02T01:00:00Z',
          status: 'resolved',
          priority: 'normal',
        }),
      );
      for (let offset = 0; offset < 1101; offset += 200)
        checked(
          await f.admin.from('conversations').insert(
            Array.from(
              { length: Math.min(200, 1101 - offset) },
              (_, index) => ({
                workspace_id: w,
                customer_id: customer,
                subject: `Metric volume ${offset + index}`,
                channel: 'manual',
                created_at: '2026-01-02T12:00:00Z',
              }),
            ),
          ),
        );
      const metrics = await getAnalytics(owner.client, w, {
        from: '2026-01-02',
        to: '2026-01-02',
        timezone: 'UTC',
      });
      expect(metrics.volume).toBe(1101);
      expect(metrics.firstResponseMinutes).toBe(20);
      expect(metrics.firstResponseSample).toBe(1);
      expect(metrics.resolutionMinutes).toBe(1500);
      expect(metrics.resolutionSample).toBe(1);
      const denied = await getAnalytics(outsider.client, w, {
        from: '2026-01-02',
        to: '2026-01-02',
        timezone: 'UTC',
      });
      expect(denied.volume).toBe(0);
      expect(denied.firstResponseMinutes).toBeNull();
      expect(
        (
          await getAnalytics(owner.client, foreign, {
            from: '2026-01-02',
            to: '2026-01-02',
            timezone: 'UTC',
          })
        ).volume,
      ).toBe(0);
    } finally {
      await f.cleanup();
    }
  },
  90_000,
);
describe.skipIf(!ready)('U0 isolated real persistence and consumer', () => {
  it('UP-U0-01 UP-U0-05 UP-U0-06: preserves assignments/roles; consumes scoped AI actions; fans out both events once', async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('owner'),
        a = await f.actor('agent-a'),
        b = await f.actor('agent-b'),
        viewer = await f.actor('viewer'),
        outsider = await f.actor('outsider');
      const w = await f.workspace(owner),
        other = await f.workspace(outsider);
      // UP-U0-08 schema lint found output-variable/column collisions in these
      // existing service claim functions. Exercise real leases, not SQL text.
      const durableId = checked(
        await f.admin.rpc('enqueue_durable_job', {
          p_workspace_id: w,
          p_job_type: 'verification.local',
          p_entity_id: null,
          p_payload: {},
          p_idempotency_key: 'claim-regression',
          p_max_attempts: 3,
        }),
      );
      const durable = checked(await f.admin.rpc('claim_durable_job'))[0];
      expect(durable.id).toBe(durableId);
      expect(durable.attempt).toBe(1);
      checked(
        await f.admin.rpc('finish_durable_job', {
          p_job_id: durable.id,
          p_lease_token: durable.lease_token,
          p_result: { verified: true },
        }),
      );
      expect(
        checked(
          await f.admin
            .from('durable_jobs')
            .select('status')
            .eq('id', durableId)
            .single(),
        ).status,
      ).toBe('succeeded');
      for (const [actor, role] of [
        [a, 'agent'],
        [b, 'agent'],
        [viewer, 'viewer'],
      ] as const)
        checked(
          await f.admin.from('workspace_members').insert({
            workspace_id: w,
            user_id: actor.id,
            role,
            status: 'active',
          }),
        );
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: w,
          p_name: 'Synthetic customer',
          p_email: '',
          p_phone: '',
          p_company: '',
          p_provider: 'manual',
          p_identity_key: '',
        }),
      );
      const conversation = async () =>
        checked(
          await owner.client.rpc('create_conversation', {
            p_workspace_id: w,
            p_customer_id: customer,
            p_subject: 'U0 regression conversation',
            p_channel: 'manual',
          }),
        ) as string;
      const c = await conversation();
      const t = checked(
        await owner.client.rpc('create_ticket', {
          p_workspace_id: w,
          p_title: 'U0 ticket',
          p_description: '',
          p_priority: 'normal',
          p_category: '',
          p_customer_id: customer,
          p_conversation_id: c,
          p_assignee_user_id: a.id,
        }),
      );
      checked(
        await owner.client.rpc('update_conversation', {
          p_workspace_id: w,
          p_conversation_id: c,
          p_assignee_user_id: a.id,
        }),
      );
      for (const [kind, id, table] of [
        ['conversation', c, 'conversations'],
        ['ticket', t, 'tickets'],
      ] as const) {
        const args = { p_workspace_id: w, [`p_${kind}_id`]: id };
        checked(
          await b.client.rpc(`update_${kind}_routing`, {
            ...args,
            p_priority: 'high',
          }),
        );
        expect(
          checked(
            await f.admin
              .from(table)
              .select('assignee_user_id,priority')
              .eq('id', id)
              .single(),
          ),
        ).toMatchObject({ assignee_user_id: a.id, priority: 'high' });
        for (const actor of [viewer, outsider])
          expect(
            (
              await actor.client.rpc(`update_${kind}_routing`, {
                ...args,
                p_assignment: 'me',
              })
            ).error,
          ).not.toBeNull();
        expect(
          (
            await b.client.rpc(`update_${kind}_routing`, {
              ...args,
              p_workspace_id: other,
            })
          ).error,
        ).not.toBeNull();
        checked(
          await b.client.rpc(`update_${kind}_routing`, {
            ...args,
            p_assignment: 'me',
          }),
        );
        expect(
          checked(
            await f.admin
              .from(table)
              .select('assignee_user_id')
              .eq('id', id)
              .single(),
          ).assignee_user_id,
        ).toBe(b.id);
        checked(
          await b.client.rpc(`update_${kind}_routing`, {
            ...args,
            p_assignment: 'unassigned',
          }),
        );
        expect(
          checked(
            await f.admin
              .from(table)
              .select('assignee_user_id')
              .eq('id', id)
              .single(),
          ).assignee_user_id,
        ).toBeNull();
      }
      const rule = async (trigger: string, actions: unknown[]) =>
        checked(
          await owner.client.rpc('create_automation_rule', {
            p_workspace_id: w,
            p_name: `U0 ${trigger}`,
            p_trigger_type: trigger,
            p_conditions: {},
            p_actions: actions,
            p_enabled: true,
          }),
        );
      await rule('priority_changed', [
        { type: 'notify', title: 'U0 priority', body: 'Synthetic' },
      ]);
      await rule('escalation', [
        { type: 'notify', title: 'U0 escalation', body: 'Synthetic' },
      ]);
      const handoff = new Date().toISOString();
      checked(
        await f.admin
          .from('conversations')
          .update({
            priority: 'urgent',
            ai_handoff_at: handoff,
            ai_handoff_reason: 'Synthetic handoff',
            updated_at: handoff,
          })
          .eq('id', c),
      );
      const events = checked(
        await f.admin
          .from('automation_runs')
          .select('id,trigger_type')
          .eq('workspace_id', w),
      );
      const leased = checked(await f.admin.rpc('claim_automation_run'))[0];
      expect(events.map((run) => run.id)).toContain(leased.id);
      expect(leased.attempt).toBe(1);
      checked(
        await f.admin
          .from('automation_runs')
          .update({
            status: 'queued',
            lease_token: null,
            lease_expires_at: null,
          })
          .eq('id', leased.id),
      );
      expect(events.map((r) => r.trigger_type).sort()).toEqual([
        'escalation',
        'priority_changed',
      ]);
      checked(
        await f.admin
          .from('conversations')
          .update({
            priority: 'urgent',
            ai_handoff_at: handoff,
            updated_at: handoff,
          })
          .eq('id', c),
      );
      localSql(
        'select app_private.process_automation_runs(100); select app_private.process_automation_runs(100);',
      );
      expect(
        checked(
          await f.admin
            .from('automation_runs')
            .select('id')
            .eq('workspace_id', w),
        ),
      ).toHaveLength(2);
      const notifications = checked(
        await f.admin
          .from('notifications')
          .select('id,title')
          .eq('workspace_id', w)
          .eq('kind', 'automation'),
      );
      expect(
        notifications.filter((n) => n.title === 'U0 priority'),
      ).toHaveLength(4);
      expect(
        notifications.filter((n) => n.title === 'U0 escalation'),
      ).toHaveLength(4);

      // Real producer → leased run → actual processor → transactional terminal state.
      const aiRule = await rule('customer_message_received', [
        { type: 'invoke_triage' },
        { type: 'invoke_ai_draft' },
      ]);
      const aiConversation = await conversation();
      // Off still emits visible terminal skips rather than orphan jobs.
      checked(
        await f.admin.from('messages').insert({
          workspace_id: w,
          conversation_id: aiConversation,
          sender_type: 'customer',
          body: 'How do I export?',
        }),
      );
      localSql('select app_private.process_automation_runs(100);');
      const off = checked(
        await f.admin
          .from('ai_runs')
          .select('status,reason_code')
          .eq('workspace_id', w)
          .eq('conversation_id', aiConversation),
      );
      expect(off).toHaveLength(2);
      expect(
        off.every((r) => r.status === 'skipped' && r.reason_code === 'AI_OFF'),
      ).toBe(true);
      checked(
        await owner.client.rpc('update_ai_config', {
          p_workspace_id: w,
          p_mode: 'assisted',
          p_tone: 'clear',
          p_confidence: 0.85,
          p_evidence: 0.75,
          p_custom_instructions: '',
          p_excluded_intents: [
            'billing',
            'security',
            'privacy',
            'legal',
            'account_change',
          ],
        }),
      );
      const embedding = [1, ...Array(383).fill(0)];
      const source = checked(
        await f.admin
          .from('knowledge_sources')
          .insert({
            workspace_id: w,
            name: 'Synthetic export',
            source_type: 'paste',
            input_text: 'Open Settings and export.',
            status: 'ready',
            enabled: true,
          })
          .select('id')
          .single(),
      );
      const doc = checked(
        await f.admin
          .from('knowledge_documents')
          .insert({
            workspace_id: w,
            source_id: source.id,
            document_index: 0,
            title: 'Export',
            content: 'Open Settings and export.',
          })
          .select('id')
          .single(),
      );
      const chunk = checked(
        await f.admin
          .from('knowledge_chunks')
          .insert({
            workspace_id: w,
            source_id: source.id,
            document_id: doc.id,
            chunk_index: 0,
            content: 'Open Settings and export.',
            token_count: 6,
            embedding: JSON.stringify(embedding),
          })
          .select('id')
          .single(),
      );
      const fresh = await conversation();
      checked(
        await f.admin.from('messages').insert({
          workspace_id: w,
          conversation_id: fresh,
          sender_type: 'customer',
          body: 'How do I export?',
        }),
      );
      localSql(
        'select app_private.process_automation_runs(100); select app_private.process_automation_runs(100);',
      );
      const response = <T>(value: T) => ({
        value,
        usage: { input_tokens: 1, output_tokens: 1 },
      });
      const provider = {
        triage: async () =>
          response({
            intent: 'how_to',
            priority: 'normal',
            sentiment: 'neutral',
            language: 'en',
            escalate: false,
            confidence: 0.99,
            summary: 'Export',
            tags: [],
          }),
        draft: async () =>
          response({
            answer: 'Open Settings and export [1].',
            citation_ordinals: [1],
            confidence: 0.99,
          }),
        quality: async () =>
          response({
            passed: true,
            grounded: true,
            safe: true,
            tone_ok: true,
            reason: 'Grounded',
            confidence: 0.99,
          }),
      };
      // Deno's npm: and Node's package condition produce nominally distinct
      // declarations for this same pinned client. Runtime boundary is real RPCs.
      const processJob = createAiProcessor(
        f.admin as unknown as Parameters<typeof createAiProcessor>[0],
        { run: async () => embedding },
      );
      // Suppress the independent automatic reply so it cannot stale the two private automation runs.
      checked(
        await f.admin
          .from('ai_runs')
          .update({
            status: 'skipped',
            decision: 'skipped',
            reason_code: 'TEST_CONTROL',
          })
          .eq('workspace_id', w)
          .eq('run_type', 'support_reply'),
      );
      for (let n = 0; n < 2; n++) {
        const job = checked(await f.admin.rpc('claim_ai_run')) as Job;
        expect(job).not.toBeNull();
        await processJob(job, provider as never, {
          triage: 'controlled-local',
          support: 'controlled-local',
          quality: 'controlled-local',
        });
      }
      const outcomes = checked(
        await f.admin
          .from('ai_runs')
          .select('id,status,decision,run_type,reason_code')
          .eq('conversation_id', fresh)
          .neq('run_type', 'support_reply'),
      );
      expect(outcomes).toHaveLength(2);
      expect(outcomes.find((r) => r.run_type === 'triage')).toMatchObject({
        status: 'completed',
        decision: 'skipped',
        reason_code: 'TRIAGE_COMPLETE',
      });
      expect(outcomes.find((r) => r.run_type === 'draft')).toMatchObject({
        status: 'completed',
        decision: 'draft',
      });
      expect(
        checked(
          await f.admin
            .from('messages')
            .select('id')
            .eq('conversation_id', fresh)
            .eq('sender_type', 'agent'),
        ),
      ).toHaveLength(0);
      expect(
        checked(
          await f.admin
            .from('durable_jobs')
            .select('id')
            .eq('workspace_id', w)
            .in('job_type', ['ai.triage', 'ai.draft']),
        ),
      ).toHaveLength(0);
      // The transactional cap must hold even if a faulty worker requests a
      // fully cited, high-confidence autonomous reply for a private action.
      const capped = await conversation();
      checked(
        await f.admin.from('messages').insert({
          workspace_id: w,
          conversation_id: capped,
          sender_type: 'customer',
          body: 'How do I export?',
        }),
      );
      localSql('select app_private.process_automation_runs(100);');
      checked(
        await f.admin
          .from('ai_runs')
          .update({ status: 'skipped', decision: 'skipped' })
          .eq('workspace_id', w)
          .eq('run_type', 'support_reply'),
      );
      for (let n = 0; n < 2; n++) {
        const job = checked(await f.admin.rpc('claim_ai_run')) as Job;
        const value = checked(
          await f.admin.rpc('finish_ai_run', {
            p_run_id: job.id,
            p_lease_token: job.lease_token,
            p_provider: 'controlled-local',
            p_model: 'controlled-local',
            p_triage: { intent: 'how_to', escalate: false },
            p_quality: {
              passed: true,
              grounded: true,
              safe: true,
              tone_ok: true,
            },
            p_output: 'Open Settings and export [1].',
            p_confidence: 0.99,
            p_evidence: 0.99,
            p_requested_decision: 'auto_sent',
            p_reason: 'CONTROLLED_CAP_TEST',
            p_steps: [],
            p_citations: [
              {
                source_id: source.id,
                chunk_id: chunk.id,
                ordinal: 1,
                score: 0.99,
                snippet: 'Open Settings and export.',
              },
            ],
            p_input_tokens: 1,
            p_output_tokens: 1,
            p_latency_ms: 1,
          }),
        );
        expect(value).toBe(job.run_type === 'triage' ? 'skipped' : 'draft');
      }
      expect(
        checked(
          await f.admin
            .from('messages')
            .select('id')
            .eq('conversation_id', capped)
            .eq('sender_type', 'agent'),
        ),
      ).toHaveLength(0);
      // Disabled or edited origin cannot execute a queued AI intent.
      const changed = await conversation();
      checked(
        await f.admin.from('messages').insert({
          workspace_id: w,
          conversation_id: changed,
          sender_type: 'customer',
          body: 'How do I export?',
        }),
      );
      localSql('select app_private.process_automation_runs(100);');
      checked(
        await f.admin
          .from('ai_runs')
          .update({ status: 'skipped', decision: 'skipped' })
          .eq('workspace_id', w)
          .eq('run_type', 'support_reply'),
      );
      checked(
        await f.admin
          .from('automation_rules')
          .update({ enabled: false, version: 2 })
          .eq('id', aiRule),
      );
      checked(await f.admin.rpc('claim_ai_run'));
      checked(await f.admin.rpc('claim_ai_run'));
      expect(
        checked(
          await f.admin
            .from('ai_runs')
            .select('status,reason_code')
            .eq('conversation_id', changed)
            .neq('run_type', 'support_reply'),
        ).every(
          (r) =>
            r.status === 'skipped' && r.reason_code === 'AUTOMATION_CHANGED',
        ),
      ).toBe(true);
    } finally {
      await f.cleanup();
    }
  }, 120_000);
});
