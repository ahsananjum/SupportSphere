import Link from 'next/link';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { listTickets } from '../../../lib/support/queries';
import { TicketForm } from '../../../components/support/support-forms';

export const metadata = {
  title: 'Tickets',
  description: 'Durable support tickets.',
  robots: { index: false, follow: false },
};
export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; priority?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active)
    return (
      <section className="workspace-card empty-state">
        <h1>Create a workspace first</h1>
        <p>Tickets will appear here after setup.</p>
      </section>
    );
  const params = await searchParams;
  let result;
  try {
    result = await listTickets(supabase, active.id, {
      ...params,
      query: params.q,
    });
  } catch {
    return (
      <section className="workspace-card error-state">
        <h1>Tickets unavailable</h1>
        <p>We could not load tickets. Refresh to retry.</p>
      </section>
    );
  }
  return (
    <div className="support-page">
      <div className="page-heading support-heading">
        <div>
          <p className="eyebrow">WORK QUEUE</p>
          <h1>Tickets</h1>
          <p className="page-intro">
            Track work that needs a durable owner, status, and timeline.
          </p>
        </div>
        <details className="create-disclosure">
          <summary className="primary-button">Create ticket</summary>
          <div className="disclosure-panel">
            <TicketForm />
          </div>
        </details>
      </div>
      <form className="filter-bar" role="search">
        <label className="sr-only" htmlFor="ticket-search">
          Search tickets
        </label>
        <input
          id="ticket-search"
          name="q"
          placeholder="Search title or description"
          defaultValue={params.q}
        />
        <select
          name="status"
          defaultValue={params.status ?? ''}
          aria-label="Filter by ticket status"
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
        <select
          name="priority"
          defaultValue={params.priority ?? ''}
          aria-label="Filter by ticket priority"
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
              ? 'No tickets match these filters'
              : 'No tickets yet'}
          </h2>
          <p>Create a ticket from a conversation or start one here.</p>
        </section>
      ) : (
        <ul className="support-list">
          {result.rows.map((row) => {
            const customer = Array.isArray(row.customers)
              ? row.customers[0]
              : row.customers;
            return (
              <li key={row.id} className="support-row">
                <Link href={`/app/tickets/${row.id}`}>
                  <span className="support-row-top">
                    <strong>
                      #{row.ticket_number} · {row.title}
                    </strong>
                    <span className={`status-chip status-${row.status}`}>
                      {row.status.replace('_', ' ')}
                    </span>
                  </span>
                  <span className="support-row-meta">
                    {customer?.name || 'No requester'} · {row.priority} ·{' '}
                    {new Date(row.updated_at).toLocaleString()}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
