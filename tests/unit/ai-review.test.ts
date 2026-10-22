import { expect, it } from 'vitest';
import { aiNextAction, qualityLabel } from '../../lib/ai/review';
it('UP-U3-05: failed/skipped/unknown results cannot acquire a sent next action from a stale decision', () => {
  expect(aiNextAction({ status: 'failed', decision: 'auto_sent' })).toContain(
    'teammate',
  );
  expect(aiNextAction({ status: 'skipped', decision: 'auto_sent' })).toContain(
    'latest',
  );
  expect(aiNextAction({ status: 'future', decision: 'auto_sent' })).toContain(
    'unrecognized',
  );
  expect(aiNextAction({ status: 'completed', decision: 'draft' })).toContain(
    'separate human action',
  );
  expect(qualityLabel(undefined)).toBe('Not recorded');
  expect(qualityLabel('true')).toBe('Not recorded');
  expect(qualityLabel(false)).toBe('Did not pass');
});
