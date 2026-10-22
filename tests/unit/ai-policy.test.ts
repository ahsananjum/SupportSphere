import { expect, it } from 'vitest';
import { aiModeLabel, aiModes } from '../../lib/ai/policy';
it('UP-U3-06: each persisted mode has a plain consequence and unknown mode stays unavailable', () => {
  expect(aiModes.map((m) => m.value)).toEqual([
    'off',
    'draft_only',
    'assisted',
  ]);
  expect(aiModeLabel('off')).toBe('Off');
  expect(aiModeLabel('draft_only')).toBe('Draft only');
  expect(aiModeLabel('unrecognized')).toBe('Mode unavailable');
});
