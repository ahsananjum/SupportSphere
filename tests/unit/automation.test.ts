import { describe, expect, it } from 'vitest';
import {
  automationRuleSchema,
  automationActionSchema,
} from '../../lib/automation/schema';
import { matchesConditions } from '../../lib/automation/engine';

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
});
