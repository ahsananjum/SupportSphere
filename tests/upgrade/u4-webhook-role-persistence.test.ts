import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { fixture, checked, localSql } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U4-03 UP-U4-05 UP-U4-06: webhook retry is bounded, deduped and tenant/role checked',
  async () => {
    const f = await fixture();
    try {
      const owner = await f.actor('u4-webhook-owner');
      const outsider = await f.actor('u4-webhook-outsider');
      const workspace = await f.workspace(owner);
      const foreignWorkspace = await f.workspace(outsider);
      const endpoint = checked(
        await owner.client.rpc('create_webhook_endpoint', {
          p_workspace_id: workspace,
          p_name: 'U4 retry endpoint',
          p_destination_url: 'https://httpbin.org/anything',
          p_secret: '0123456789012345678901234567890123456789012',
          p_event_types: ['webhook.test'],
        }),
      );
      const eventId = `u4-duplicate-${randomUUID()}`;
      const escapedWorkspace = workspace.replaceAll("'", "''");
      const escapedEvent = eventId.replaceAll("'", "''");
      localSql(
        `select app_private.enqueue_webhook_event_internal('${escapedWorkspace}'::uuid,'${escapedEvent}','webhook.test','{}'::jsonb); select app_private.enqueue_webhook_event_internal('${escapedWorkspace}'::uuid,'${escapedEvent}','webhook.test','{}'::jsonb);`,
      );
      const deduped = checked(
        await f.admin
          .from('webhook_deliveries')
          .select('id')
          .eq('workspace_id', workspace)
          .eq('endpoint_id', endpoint)
          .eq('event_id', eventId),
      );
      expect(deduped).toHaveLength(1);
      const delivery = deduped[0].id;
      checked(
        await f.admin
          .from('webhook_deliveries')
          .update({
            status: 'failed',
            attempts: 2,
            max_attempts: 3,
            last_error: 'HTTP_503',
          })
          .eq('id', delivery),
      );
      checked(
        await owner.client.rpc('retry_webhook_delivery', {
          p_workspace_id: workspace,
          p_delivery_id: delivery,
        }),
      );
      const retried = checked(
        await f.admin
          .from('webhook_deliveries')
          .select('status,attempts,last_error')
          .eq('id', delivery)
          .single(),
      );
      expect(retried).toMatchObject({
        status: 'queued',
        attempts: 0,
        last_error: null,
      });
      const forbidden = await outsider.client.rpc('retry_webhook_delivery', {
        p_workspace_id: workspace,
        p_delivery_id: delivery,
      });
      expect(forbidden.error).toBeTruthy();
      const foreign = await owner.client.rpc('retry_webhook_delivery', {
        p_workspace_id: foreignWorkspace,
        p_delivery_id: delivery,
      });
      expect(foreign.error).toBeTruthy();
      const audits = checked(
        await f.admin
          .from('audit_logs')
          .select('id')
          .eq('workspace_id', workspace)
          .eq('action', 'webhook.delivery_retried')
          .eq('target_id', delivery),
      );
      expect(audits).toHaveLength(1);
    } finally {
      await f.cleanup();
    }
  },
  120_000,
);
