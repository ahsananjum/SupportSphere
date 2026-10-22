import { expect, it } from 'vitest';
import { fixture, checked, localSql } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U4-02 UP-U4-04 UP-U4-07: automation reaches one terminal outcome with deduped notification and safe disable skip',
  async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('u4-automation');
      const workspace = await f.workspace(owner);
      const customer = checked(
        await owner.client.rpc('create_or_get_customer', {
          p_workspace_id: workspace,
          p_name: 'U4 customer',
          p_email: 'u4@example.invalid',
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
            name: 'U4 notify rule',
            trigger_type: 'conversation_created',
            conditions: {},
            actions: [
              {
                type: 'notify',
                title: 'Automation matched',
                body: 'Review the record.',
              },
            ],
            enabled: true,
          })
          .select('id')
          .single(),
      );
      checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject: 'U4 automation terminal',
          p_channel: 'manual',
        }),
      );
      const queued = checked(
        await f.admin
          .from('automation_runs')
          .select('id,status')
          .eq('workspace_id', workspace)
          .eq('rule_id', rule.id),
      );
      expect(queued).toHaveLength(1);
      localSql('select app_private.process_automation_runs(100);');
      const run = checked(
        await f.admin
          .from('automation_runs')
          .select('status,completed_at,result')
          .eq('id', queued[0].id)
          .single(),
      );
      expect(run.status).toBe('succeeded');
      expect(run.completed_at).toBeTruthy();
      const notices = checked(
        await f.admin
          .from('notifications')
          .select('id')
          .eq('workspace_id', workspace)
          .eq('kind', 'automation')
          .eq('dedupe_key', `automation:${queued[0].id}:0`),
      );
      expect(notices).toHaveLength(1);
      localSql('select app_private.process_automation_runs(100);');
      const noticesAfterReplay = checked(
        await f.admin
          .from('notifications')
          .select('id')
          .eq('workspace_id', workspace)
          .eq('kind', 'automation')
          .eq('dedupe_key', `automation:${queued[0].id}:0`),
      );
      expect(noticesAfterReplay).toHaveLength(1);

      const disabledRule = checked(
        await f.admin
          .from('automation_rules')
          .insert({
            workspace_id: workspace,
            name: 'U4 disabled rule',
            trigger_type: 'conversation_created',
            conditions: {},
            actions: [
              { type: 'notify', title: 'Should skip', body: 'No effect.' },
            ],
            enabled: true,
          })
          .select('id')
          .single(),
      );
      const disabledConversation = checked(
        await owner.client.rpc('create_conversation', {
          p_workspace_id: workspace,
          p_customer_id: customer,
          p_subject: 'U4 disabled terminal',
          p_channel: 'manual',
        }),
      );
      checked(
        await f.admin
          .from('automation_rules')
          .update({ enabled: false, version: 2 })
          .eq('id', disabledRule.id),
      );
      localSql('select app_private.process_automation_runs(100);');
      const skipped = checked(
        await f.admin
          .from('automation_runs')
          .select('status,result')
          .eq('workspace_id', workspace)
          .eq('rule_id', disabledRule.id)
          .eq('trigger_entity_id', disabledConversation)
          .single(),
      );
      expect(skipped.status).toBe('skipped');
      expect(skipped.result).toMatchObject({ reason: 'disabled_or_changed' });
    } finally {
      await f.cleanup();
    }
  },
  120_000,
);
