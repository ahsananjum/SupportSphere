import { it, expect } from 'vitest';
import {
  ticketEventLabel,
  eventActorLabel,
} from '../../lib/support/presentation';

it('UP-U2-07: historical before/after changes use readable labels and truthful missing-actor fallbacks', () => {
  expect(ticketEventLabel({ event_type: 'created', payload: {} })).toBe(
    'Ticket created',
  );
  expect(
    ticketEventLabel({
      event_type: 'updated',
      payload: {
        from_status: 'open',
        to_status: 'in_progress',
        from_priority: 'normal',
        to_priority: 'high',
      },
    }),
  ).toBe('Status: Open → In progress · Priority: Normal → High');
  expect(
    ticketEventLabel({
      event_type: 'updated',
      payload: { from_status: 'open', to_status: 'open' },
    }),
  ).toContain('Detailed changes were not recorded');
  expect(ticketEventLabel({ event_type: '<private>', payload: null })).toBe(
    'Ticket activity recorded',
  );
  expect(eventActorLabel(null, 'me', [])).toBe('System or unavailable actor');
  expect(eventActorLabel('other', 'me', [])).toBe(
    'Former or unavailable teammate',
  );
  expect(eventActorLabel('me', 'me', [])).toBe('You');
});
