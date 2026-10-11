import { describe, expect, it } from 'vitest';
import {
  defaultAnalyticsDates,
  localDateToUtc,
  metricDefinitions,
} from '../../lib/analytics/definitions';

describe('analytics contracts', () => {
  it('documents every P09 metric', () => {
    expect(Object.keys(metricDefinitions)).toEqual(
      expect.arrayContaining([
        'volume',
        'openClosed',
        'ticketStatusPriority',
        'firstResponse',
        'resolution',
        'categories',
        'aiUsage',
        'escalation',
        'feedback',
        'retrieval',
      ]),
    );
  });

  it('converts workspace-local midnight to UTC using the IANA timezone', () => {
    expect(localDateToUtc('2026-01-15', 'Asia/Karachi').toISOString()).toBe(
      '2026-01-14T19:00:00.000Z',
    );
    expect(localDateToUtc('2026-07-15', 'America/New_York').toISOString()).toBe(
      '2026-07-15T04:00:00.000Z',
    );
  });

  it('produces a bounded default date window', () => {
    const dates = defaultAnalyticsDates();
    expect(dates.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dates.from <= dates.to).toBe(true);
  });
});
