import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../supabase/database.types';

export async function supportOverview(
  client: SupabaseClient<Database>,
  workspaceId: string,
) {
  const queues = [
    {
      table: 'conversations',
      status: 'open',
      label: 'Open conversations',
      href: '/app/inbox?status=open',
    },
    {
      table: 'conversations',
      status: 'pending',
      label: 'Pending conversations',
      href: '/app/inbox?status=pending',
    },
    {
      table: 'tickets',
      status: 'open',
      label: 'Open tickets',
      href: '/app/tickets?status=open',
    },
    {
      table: 'tickets',
      status: 'in_progress',
      label: 'Tickets in progress',
      href: '/app/tickets?status=in_progress',
    },
  ] as const;
  return Promise.all(
    queues.map(async (queue) => {
      const { count, error } = await client
        .from(queue.table)
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', queue.status);
      return {
        ...queue,
        count: error ? null : count,
        unavailable: Boolean(error) || count === null,
      };
    }),
  );
}
