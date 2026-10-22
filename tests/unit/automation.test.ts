import { describe, expect, it } from 'vitest';
import {
  automationRuleSchema,
  automationActionSchema,
  describeAutomationRule,
} from '../../lib/automation/schema';
import { matchesConditions } from '../../lib/automation/engine';
import { automationRunContext } from '../../lib/ui/automated-action';

describe('automation contracts', () => {
  it('accepts only explicit, bounded action schemas', () => {
    const parsed = automationRuleSchema.safeParse({
      name: 'Urgent routing',
      triggerType: 'priority_changed',
      conditions: { priority: 'urgent' },
      actions: [
        { type: 'notify', title: 'Urgent', body: 'Review this conversation.' },
      ],
      enabled: true,
    });
    expect(parsed.success).toBe(true);
    expect(automationActionSchema.safeParse({ type: 'run_code' }).success).toBe(
      false,
    );
  });

  it('matches every configured condition deterministically', () => {
    expect(
      matchesConditions(
        { priority: 'urgent', status: 'open', channel: 'widget' },
        { priority: 'urgent', status: 'open' },
      ),
    ).toBe(true);
    expect(matchesConditions({ priority: 'low' }, { priority: 'urgent' })).toBe(
      false,
    );
    expect(matchesConditions({}, { unknown: 'value' })).toBe(false);
  });

  it('explains trigger and action in a stable, readable summary', () => {
    expect(
      describeAutomationRule({
        name: 'Urgent',
        triggerType: 'priority_changed',
        conditions: { priority: 'urgent' },
        actions: [{ type: 'notify', title: 'Review', body: 'Open it' }],
        enabled: true,
      }),
    ).toContain(
      'When a priority changes and priority is urgent, notify the support team: Review. Enabled',
    );
  });

  it('rejects trigger/action combinations that can loop', () => {
    expect(
      automationRuleSchema.safeParse({
        name: 'Loop',
        triggerType: 'ticket_created',
        conditions: {},
        actions: [{ type: 'create_ticket', title: 'Duplicate' }],
        enabled: true,
      }).success,
    ).toBe(false);
    expect(
      automationRuleSchema.safeParse({
        name: 'Tag',
        triggerType: 'tag_added',
        conditions: {},
        actions: [{ type: 'notify', title: 'Tag', body: 'Review' }],
        enabled: true,
      }).success,
    ).toBe(false);
  });

  it('keeps run history tied to rule, record and terminal outcome', () => {
    expect(
      automationRunContext({
        ruleName: 'Urgent routing',
        triggerType: 'priority_changed',
        triggerEntityId: '12345678-dead-beef-dead-beefdeadbeef',
        completedAt: '2026-10-20T00:00:00Z',
      }),
    ).toBe(
      'Urgent routing · priority changed · record 12345678 · terminal outcome recorded',
    );
    expect(
      automationRunContext({ ruleName: null, triggerType: 'ticket_created' }),
    ).toContain('Deleted or unavailable rule');
  });
});
