import { it, expect } from 'vitest';
import { supportOverview } from '../../lib/support/overview';

it('UP-U2-08: queue counts use exact matching tenant/status filters and failures never become zero', async () => {
  const calls: unknown[] = [];
  let n = 0;
  const client = {
    from: (table: string) => {
      const index = n++;
      const query = {
        select: (...args: unknown[]) => {
          calls.push([table, ...args]);
          return query;
        },
        eq: (key: string, value: string) => {
          calls.push([key, value]);
          return query;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({
            count: index === 0 ? null : index,
            error: index === 0 ? { message: 'private' } : null,
          }).then(resolve),
      };
      return query;
    },
  };
  const queues = await supportOverview(client as never, 'tenant');
  expect(queues[0]).toMatchObject({
    count: null,
    unavailable: true,
    href: '/app/inbox?status=open',
  });
  expect(queues.slice(1).map((q) => q.count)).toEqual([1, 2, 3]);
  expect(
    calls.filter((c) => JSON.stringify(c) === '["workspace_id","tenant"]'),
  ).toHaveLength(4);
  expect(calls).toContainEqual([
    'conversations',
    'id',
    { count: 'exact', head: true },
  ]);
  expect(calls).toContainEqual(['status', 'in_progress']);
});
