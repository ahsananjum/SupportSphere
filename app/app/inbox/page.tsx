import { assigneeLabel } from '../../../lib/support/presentation';
import { listSupportMembers } from '../../../lib/support/queries';
import { ListPagination } from '../../../components/support/list-pagination';
import {
  parseListParams,
  detailHref,
  type ListParams,
} from '../../../lib/support/list-navigation';
import {
  StatePanel,
  StatusChip,
  Timestamp,
} from '../../../components/shared/record-state';
import { statusLabel } from '../../../lib/ui/presentation';
import Link from 'next/link';
import { PageHeading } from '../../../components/shared/page-heading';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { listConversations } from '../../../lib/support/queries';
import { InboxRealtime } from '../../../components/support/inbox-realtime';

export const metadata = {
  title: 'Inbox',
  description: 'Workspace conversations.',
  robots: { index: false, follow: false },
};
export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <StatePanel title="Create a workspace first" level={1}>
        <p>Your inbox will appear here after setup.</p>
      </StatePanel>
    );
  const filters = parseListParams(await searchParams, 'inbox');
  const params = {
    q: filters.query,
    status: filters.status,
    priority: filters.priority,
  };
  let result;
  let members;
  try {
    members = await listSupportMembers(supabase, active.id);
    result = await listConversations(supabase, active.id, {
      ...filters,
    });
  } catch {
    return (
      <StatePanel
        kind="error"
        title="Inbox unavailable"
        level={1}
        actions={
          <Link className="secondary-button" href="/app/inbox">
            Retry
          </Link>
        }
      >
        <p>We could not load conversations. Refresh to retry.</p>
      </StatePanel>
    );
  }
  return (
    <div className="support-page">
      <PageHeading
        title="Inbox"
        eyebrow="SUPPORT OPERATIONS"
        description="Triage customer conversations and keep every reply grounded in a real record."
        actions={
          <Link href="/app/customers" className="secondary-button">
            Customers <span aria-hidden="true">↗</span>
          </Link>
        }
      />
      <InboxRealtime workspaceId={active.id} />
      <form className="filter-bar" role="search">
        {filters.customerId && (
          <input type="hidden" name="customer" value={filters.customerId} />
        )}
        {filters.conversationId && (
          <input
            type="hidden"
            name="conversation"
            value={filters.conversationId}
          />
        )}
        <label className="sr-only" htmlFor="inbox-search">
          Search conversations
        </label>
        <input
          id="inbox-search"
          name="q"
          placeholder="Search subject or channel"
          defaultValue={params.q}
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="closed">Closed</option>
        </select>
        <select
          name="priority"
          defaultValue={params.priority ?? ''}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <button className="secondary-button" type="submit">
          Filter
        </button>
        {(filters.query ||
          filters.status ||
          filters.priority ||
          filters.customerId ||
          filters.conversationId) && (
          <Link className="quiet-link" href="/app/inbox">
            Clear filters
          </Link>
        )}
      </form>
      <ListPagination kind="inbox" filters={filters} count={result.count} />
      {result.rows.length === 0 ? (
        <StatePanel
          title={
            filters.page > 0
              ? 'No records on this page'
              : params.q || params.status || params.priority
                ? 'No conversations match these filters'
                : 'Your inbox is clear'
          }
          actions={
            <Link
              href={
                filters.query ||
                filters.status ||
                filters.priority ||
                filters.customerId ||
                filters.conversationId
                  ? '/app/inbox'
                  : '/app/customers'
              }
              className="primary-button"
            >
              {filters.query ||
              filters.status ||
              filters.priority ||
              filters.customerId ||
              filters.conversationId
                ? 'Clear filters'
                : 'Open customers'}
            </Link>
          }
        >
          <p>
            Create a customer, then start a conversation to begin support work.
          </p>
        </StatePanel>
      ) : (
        <ul className="support-list">
          {result.rows.map((row) => {
            const customer = Array.isArray(row.customers)
              ? row.customers[0]
              : row.customers;
            return (
              <li key={row.id} className="support-row">
                <Link href={detailHref('inbox', row.id, filters)}>
                  <span className="support-row-top">
                    <strong>{row.subject}</strong>
                    <StatusChip value={row.status} />
                  </span>
                  <span className="support-row-meta">
                    {customer?.name || customer?.email || 'Unknown customer'} ·{' '}
                    {row.channel} · Priority: {statusLabel(row.priority)} ·
                    Owner: {assigneeLabel(row.assignee_user_id, members)}
                  </span>
                  <Timestamp
                    value={row.updated_at}
                    timezone={active.timezone}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
