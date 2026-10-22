import { describe, expect, it } from 'vitest';
import { getAnalytics, readAnalyticsRows } from '../../lib/analytics/queries';
import {
  localDateToUtc,
  validateAnalyticsDates,
} from '../../lib/analytics/definitions';

// Query adapter evaluates filters against records; it proves query cohort selection,
// not database RLS or provider behavior (separate isolated tests).
function fixtureClient(tables: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      let rows = tables[table] ?? [];
      const q = {
        select() {
          return q;
        },
        order() {
          return q;
        },
        eq(key: string, value: unknown) {
          rows = rows.filter((r) => r[key] === value);
          return q;
        },
        gte(key: string, value: string) {
          rows = rows.filter(
            (r) => Date.parse(String(r[key])) >= Date.parse(value),
          );
          return q;
        },
        lt(key: string, value: string) {
          rows = rows.filter(
            (r) => Date.parse(String(r[key])) < Date.parse(value),
          );
          return q;
        },
        in(key: string, values: unknown[]) {
          rows = rows.filter((r) => values.includes(r[key]));
          return q;
        },
        range(start: number, end: number) {
          return Promise.resolve({
            data: rows.slice(start, end + 1),
            error: null,
          });
        },
      };
      return q;
    },
  };
}

describe('UP-U0-04 analytics cohorts', () => {
  it('includes the exact start boundary independent of timestamp offset notation', async () => {
    const client = fixtureClient({
      messages: [
        {
          id: 'a',
          workspace_id: 'w',
          conversation_id: 'c',
          sender_type: 'customer',
          created_at: '2026-01-01T23:50:00+00:00',
        },
        {
          id: 'b',
          workspace_id: 'w',
          conversation_id: 'c',
          sender_type: 'agent',
          created_at: '2026-01-02T00:00:00+00:00',
        },
      ],
    });
    expect(
      (
        await getAnalytics(client as never, 'w', {
          from: '2026-01-02',
          to: '2026-01-02',
          timezone: 'UTC',
        })
      ).firstResponseMinutes,
    ).toBe(10);
  });
  it('includes old tickets resolved now, prior customer history, and citations on the selected run cohort', async () => {
    const row = (fields: Record<string, unknown>) => ({
      workspace_id: 'w',
      ...fields,
    });
    const client = fixtureClient({
      conversations: [row({ id: 'c', created_at: '2026-01-01T00:00:00Z' })],
      tickets: [
        row({
          id: 'old',
          created_at: '2026-01-01T00:00:00Z',
          resolved_at: '2026-01-02T01:00:00Z',
        }),
        row({
          id: 'new',
          created_at: '2026-01-02T00:00:00Z',
          resolved_at: null,
        }),
      ],
      messages: [
        row({
          id: 'm1',
          conversation_id: 'c',
          sender_type: 'customer',
          created_at: '2026-01-01T23:50:00Z',
        }),
        row({
          id: 'm2',
          conversation_id: 'c',
          sender_type: 'agent',
          created_at: '2026-01-02T00:10:00Z',
        }),
        row({
          id: 'm3',
          conversation_id: 'c',
          sender_type: 'agent',
          created_at: '2026-01-02T00:30:00Z',
        }),
      ],
      ai_runs: [
        row({
          id: 'run',
          status: 'completed',
          decision: 'draft',
          created_at: '2026-01-02T23:59:00Z',
        }),
      ],
      ai_citations: [
        row({ id: 'cite', run_id: 'run', created_at: '2026-01-03T00:01:00Z' }),
      ],
    });
    const result = await getAnalytics(client as never, 'w', {
      from: '2026-01-02',
      to: '2026-01-02',
      timezone: 'UTC',
    });
    expect(result.volume).toBe(0);
    expect(result.firstResponseMinutes).toBe(20);
    expect(result.firstResponseSample).toBe(1);
    expect(result.resolutionMinutes).toBe(1500);
    expect(result.resolutionSample).toBe(1);
    expect(result.retrievalRate).toBe(1);
  });
  it('excludes later replies when the first response was before the selected range', async () => {
    const client = fixtureClient({
      messages: [
        {
          workspace_id: 'w',
          conversation_id: 'c',
          sender_type: 'customer',
          created_at: '2026-01-01T01:00:00Z',
        },
        {
          workspace_id: 'w',
          conversation_id: 'c',
          sender_type: 'agent',
          created_at: '2026-01-01T02:00:00Z',
        },
        {
          workspace_id: 'w',
          conversation_id: 'c',
          sender_type: 'agent',
          created_at: '2026-01-02T02:00:00Z',
        },
      ],
    });
    expect(
      (
        await getAnalytics(client as never, 'w', {
          from: '2026-01-02',
          to: '2026-01-02',
          timezone: 'UTC',
        })
      ).firstResponseSample,
    ).toBe(0);
  });
  it('traverses more than 1000 rows and propagates a later-page failure', async () => {
    const client = fixtureClient({
      t: Array.from({ length: 1101 }, (_, id) => ({ id })),
    });
    expect(await readAnalyticsRows(() => client.from('t'))).toHaveLength(1101);
    await expect(
      readAnalyticsRows(() => ({
        order() {
          return this;
        },
        range(start: number) {
          return {
            data: start ? null : Array(1000).fill({}),
            error: start ? {} : null,
          };
        },
      })),
    ).rejects.toThrow('unavailable');
  });
  it('rejects impossible/reversed dates and handles DST calendar boundaries', async () => {
    expect(validateAnalyticsDates('2026-02-30', '2026-03-02')).toHaveProperty(
      'from',
    );
    expect(validateAnalyticsDates('2026-03-02', '2026-03-01')).toHaveProperty(
      'to',
    );
    expect(validateAnalyticsDates('2024-02-29', '2024-02-29')).toEqual({});
    expect(localDateToUtc('2026-03-09', 'America/New_York').toISOString()).toBe(
      '2026-03-09T04:00:00.000Z',
    );
    await expect(
      getAnalytics(fixtureClient({}) as never, 'w', {
        from: '2026-02-30',
        to: '2026-03-02',
        timezone: 'UTC',
      }),
    ).rejects.toThrow('Invalid');
  });
});
