import Link from 'next/link';
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
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
        <p>Your inbox will appear here after setup.</p>
      </section>
    );
  const params = await searchParams;
  let result;
  try {
    result = await listConversations(supabase, active.id, {
      ...params,
      query: params.q,
    });
  } catch {
    return (
      <section className="workspace-card error-state">
        <h1>Inbox unavailable</h1>
        <p>We could not load conversations. Refresh to retry.</p>
        <Link className="secondary-button" href="/app/inbox">
          Retry
        </Link>
      </section>
    );
  }
  return (
    <div className="support-page">
      <div className="page-heading support-heading">
        <div>
          <p className="eyebrow">SUPPORT OPERATIONS</p>
          <h1>Inbox</h1>
          <p className="page-intro">
            Triage customer conversations and keep every reply grounded in a
            real record.
          </p>
        </div>
        <Link href="/app/customers" className="secondary-button">
          Customers <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <InboxRealtime workspaceId={active.id} />
      <form className="filter-bar" role="search">
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
      </form>
      {result.rows.length === 0 ? (
        <section className="workspace-card empty-state">
          <h2>
            {params.q || params.status || params.priority
              ? 'No conversations match these filters'
              : 'Your inbox is clear'}
          </h2>
          <p>
            Create a customer, then start a conversation to begin support work.
          </p>
          <Link href="/app/customers" className="primary-button">
            Open customers
          </Link>
        </section>
      ) : (
        <ul className="support-list">
          {result.rows.map((row) => {
            const customer = Array.isArray(row.customers)
              ? row.customers[0]
              : row.customers;
            return (
              <li key={row.id} className="support-row">
                <Link href={`/app/inbox/${row.id}`}>
                  <span className="support-row-top">
                    <strong>{row.subject}</strong>
                    <span className={`status-chip status-${row.status}`}>
                      {row.status}
                    </span>
                  </span>
                  <span className="support-row-meta">
                    {customer?.name || customer?.email || 'Unknown customer'} ·{' '}
                    {row.channel} · {row.priority}
                  </span>
                  <time dateTime={row.updated_at}>
                    {new Date(row.updated_at).toLocaleString()}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
