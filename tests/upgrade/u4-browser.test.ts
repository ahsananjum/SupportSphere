import { expect, it } from 'vitest';
import { expect as visible } from '@playwright/test';
import { browserFixture } from './browser-fixture';
import { checked } from './fixture';

it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
  'UP-U4-01 UP-U4-02 UP-U4-03 UP-U4-04 UP-U4-05 UP-U4-06: U4 operational surfaces are actionable',
  async () => {
    const f = await browserFixture();
    try {
      const owner = await f.actor('owner');
      const workspaceId = await f.workspace(owner);
      const ruleId = checked(
        await owner.client.rpc('create_automation_rule', {
          p_workspace_id: workspaceId,
          p_name: 'U4 urgent review',
          p_trigger_type: 'priority_changed',
          p_conditions: { priority: 'urgent' },
          p_actions: [
            {
              type: 'notify',
              title: 'Review urgent work',
              body: 'Open the record.',
            },
          ],
          p_enabled: true,
        }),
      );
      const endpointId = checked(
        await owner.client.rpc('create_webhook_endpoint', {
          p_workspace_id: workspaceId,
          p_name: 'U4 local receiver',
          p_destination_url: 'https://httpbin.org/anything',
          p_secret: '0123456789012345678901234567890123456789012',
          p_event_types: ['webhook.test'],
        }),
      );
      const deliveryId = checked(
        await owner.client.rpc('enqueue_webhook_test', {
          p_workspace_id: workspaceId,
          p_endpoint_id: endpointId,
        }),
      );
      checked(
        await f.admin
          .from('webhook_deliveries')
          .update({
            status: 'failed',
            attempts: 1,
            max_attempts: 3,
            last_error: 'RETRY_EXHAUSTED',
          })
          .eq('id', deliveryId),
      );
      checked(
        await f.admin.from('notifications').insert({
          workspace_id: workspaceId,
          user_id: owner.id,
          kind: 'automation',
          title: 'U4 review needed',
          body: 'Open the urgent record.',
          target_route: '/app/automations',
        }),
      );
      checked(
        await f.admin.from('audit_logs').insert({
          workspace_id: workspaceId,
          actor_user_id: owner.id,
          action: 'automation.rule_created',
          target_type: 'automation_rule',
          target_id: ruleId,
        }),
      );
      const page = await f.pageFor(owner);
      for (const width of [320, 360, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${f.base}/app/automations`);
        await visible(
          page.getByText(/When a priority changes and priority is urgent/),
        ).toBeVisible();
        await visible(page.getByText('U4 urgent review')).toBeVisible();
        await visible(
          page.getByText('Edit rule', { exact: true }),
        ).toBeVisible();
        if (width === 320) {
          await page.getByText('Edit rule', { exact: true }).click();
          checked(
            await owner.client.rpc('update_automation_rule_versioned', {
              p_workspace_id: workspaceId,
              p_rule_id: ruleId,
              p_expected_version: 1,
              p_name: 'U4 concurrent edit',
              p_trigger_type: 'priority_changed',
              p_conditions: { priority: 'urgent' },
              p_actions: [
                {
                  type: 'notify',
                  title: 'Review urgent work',
                  body: 'Open the record.',
                },
              ],
              p_enabled: true,
            }),
          );
          await page.getByLabel('Rule name').last().fill('Stale edit');
          await page.getByRole('button', { name: 'Save rule version' }).click();
          await visible(
            page.getByText(
              'This rule changed in another tab. Refresh it before saving.',
            ),
          ).toBeVisible();
          checked(
            await owner.client.rpc('update_automation_rule_versioned', {
              p_workspace_id: workspaceId,
              p_rule_id: ruleId,
              p_expected_version: 2,
              p_name: 'U4 urgent review',
              p_trigger_type: 'priority_changed',
              p_conditions: { priority: 'urgent' },
              p_actions: [
                {
                  type: 'notify',
                  title: 'Review urgent work',
                  body: 'Open the record.',
                },
              ],
              p_enabled: true,
            }),
          );
        }
        await page.goto(`${f.base}/app/settings/integrations`);
        await visible(
          page.getByText('U4 local receiver', { exact: true }),
        ).toBeVisible();
        await visible(
          page.getByText('Eligible for one bounded retry.'),
        ).toBeVisible();
        await visible(
          page.getByRole('button', { name: 'Retry delivery' }),
        ).toBeVisible();
        await page.goto(`${f.base}/app/notifications`);
        await visible(page.getByText(/1 unread/)).toBeVisible();
        await visible(
          page.getByText('automation', { exact: true }),
        ).toBeVisible();
        await page.goto(`${f.base}/app/team`);
        await visible(page.getByText(/Full workspace control/)).toBeVisible();
        await page.goto(`${f.base}/app/settings/security`);
        await visible(
          page.getByText('Automation rule created').first(),
        ).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width + 1);
      }
    } finally {
      await f.close();
    }
  },
  180_000,
);
