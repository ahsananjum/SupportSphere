import { describe, expect, it } from 'vitest';
import { getAnalytics } from '../../lib/analytics/queries';
import { fixture, checked } from './fixture';

function client(records: Record<string, Record<string, unknown>[]>) {
  return {
    from(table: string) {
      let rows = records[table] ?? [];
      const q = {
        select() {
          return q;
        },
        order() {
          return q;
        },
        eq(k: string, v: unknown) {
          rows = rows.filter((r) => r[k] === v);
          return q;
        },
        gte(k: string, v: string) {
          rows = rows.filter((r) => Date.parse(String(r[k])) >= Date.parse(v));
          return q;
        },
        lt(k: string, v: string) {
          rows = rows.filter((r) => Date.parse(String(r[k])) < Date.parse(v));
          return q;
        },
        in(k: string, values: unknown[]) {
          rows = rows.filter((r) => values.includes(r[k]));
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

describe('UP-U6-04 metrics and evaluation boundaries', () => {
  it('keeps large totals and denominators exact across paged cohorts', async () => {
    const conversations = Array.from({ length: 2501 }, (_, id) => ({
      id: String(id),
      workspace_id: 'w',
      status: id % 2 ? 'open' : 'closed',
      priority: 'normal',
      created_at: '2026-01-15T12:00:00Z',
    }));
    const result = await getAnalytics(client({ conversations }) as never, 'w', {
      from: '2026-01-15',
      to: '2026-01-15',
      timezone: 'UTC',
    });
    expect(result.volume).toBe(2501);
    expect(result.openClosed.open).toBe(1250);
    expect(result.openClosed.closed).toBe(1251);
    expect(result.escalationRate).toBeNull();
    expect(result.retrievalRate).toBeNull();
  });
  it('does not turn unavailable evaluation data into a zero or passing rate', async () => {
    const failing = {
      from() {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          gte() {
            return this;
          },
          lt() {
            return this;
          },
          order() {
            return this;
          },
          range() {
            return Promise.resolve({
              data: null,
              error: { message: 'timeout' },
            });
          },
        };
      },
    };
    await expect(
      getAnalytics(failing as never, 'w', {
        from: '2026-01-15',
        to: '2026-01-15',
        timezone: 'UTC',
      }),
    ).rejects.toThrow(/unavailable/);
  });

  it.skipIf(process.env.RUN_UPGRADE_LOCAL !== '1')(
    'UP-U6-04: persisted evaluation cases retain explicit expectations before a run',
    async () => {
      const f = await fixture();
      try {
        const owner = await f.actor('evaluation');
        const workspace = await f.workspace(owner);
        const count = checked(
          await owner.client.rpc('ensure_evaluation_cases', {
            p_workspace_id: workspace,
          }),
        );
        const cases = checked(
          await owner.client
            .from('evaluation_cases')
            .select(
              'case_key,expected_decision,expected_reason_code,expected_source_required',
            )
            .eq('workspace_id', workspace)
            .eq('active', true),
        );
        expect(count).toBe(cases.length);
        expect(cases.length).toBeGreaterThanOrEqual(5);
        expect(
          cases.every((item) => item.case_key && item.expected_decision),
        ).toBe(true);
        expect(
          cases.some((item) => item.expected_source_required === true),
        ).toBe(true);
      } finally {
        await f.cleanup();
      }
    },
  );
});
