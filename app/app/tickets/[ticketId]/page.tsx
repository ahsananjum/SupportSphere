import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { getTicket } from '../../../../lib/support/queries';
import { updateTicket } from '../../support-actions';

export const metadata = {
  title: 'Ticket',
  description: 'Ticket detail and timeline.',
  robots: { index: false, follow: false },
};
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticketId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  const { ticketId } = await params;
  const query = await searchParams;
  if (!active) notFound();
  const ticket = await getTicket(supabase, active.id, ticketId);
  if (!ticket) notFound();
  const customer = Array.isArray(ticket.customers)
    ? ticket.customers[0]
    : ticket.customers;
  return (
    <div className="support-page">
      <Link href="/app/tickets" className="back-link">
        ← Tickets
      </Link>
      <div className="page-heading">
        <p className="eyebrow">TICKET #{ticket.ticket_number}</p>
        <h1>{ticket.title}</h1>
        <p className="page-intro">
          {customer?.name || 'No requester'} · Created{' '}
          {new Date(ticket.created_at).toLocaleString()}
        </p>
      </div>
      {query.notice && (
        <p className="form-success" role="status">
          Ticket updated.
        </p>
      )}
      {query.error && (
        <p className="form-error" role="alert">
          We could not update this ticket.
        </p>
      )}
      <div className="detail-grid">
        <section className="workspace-card ticket-description">
          <p className="eyebrow">SUMMARY</p>
          <p>{ticket.description || 'No description provided.'}</p>
          <h2>Timeline</h2>
          {ticket.ticket_events?.length ? (
            <ol className="timeline">
              {ticket.ticket_events.map((event) => (
                <li key={event.id}>
                  <strong>{event.event_type}</strong>
                  <time dateTime={event.created_at}>
                    {new Date(event.created_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="page-intro">No events recorded.</p>
          )}
        </section>
        <aside className="workspace-card">
          <p className="eyebrow">ROUTING</p>
          <form action={updateTicket} className="form-stack">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <div className="field">
              <label htmlFor="ticket-status">Status</label>
              <select
                id="ticket-status"
                name="status"
                defaultValue={ticket.status}
              >
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                name="priority"
                defaultValue={ticket.priority}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="ticket-assignee">Assignment</label>
              <select
                id="ticket-assignee"
                name="assignee"
                defaultValue={ticket.assignee_user_id ? 'me' : ''}
              >
                <option value="">Unassigned</option>
                <option value="me">Assign to me</option>
              </select>
            </div>
            <button className="secondary-button" type="submit">
              Save ticket
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
