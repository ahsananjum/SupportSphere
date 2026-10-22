import { RecordEditForm } from '../../../../components/support/record-edit-form';
import { Disclosure } from '../../../../components/shared/disclosure';
import { updateTicketDetails } from '../../support-actions';
import { assigneeLabel } from '../../../../lib/support/presentation';
import { StatusChip } from '../../../../components/shared/record-state';
import { RoutingFields } from '../../../../components/support/routing-fields';
import { listReturnHref } from '../../../../lib/support/list-navigation';
import {
  ticketEventLabel,
  eventActorLabel,
} from '../../../../lib/support/presentation';
import { listSupportMembers } from '../../../../lib/support/queries';
import { Timestamp } from '../../../../components/shared/record-state';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { getTicket } from '../../../../lib/support/queries';
import { updateTicket } from '../../support-actions';
import { SubmitButton } from '../../../../components/shared/submit-button';

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
  searchParams: Promise<{
    notice?: string;
    error?: string;
    returnTo?: string | string[];
  }>;
}) {
  const { supabase, active, user } = await getWorkspaceContext();
  const { ticketId } = await params;
  const query = await searchParams;
  if (!active) notFound();
  const ticket = await getTicket(supabase, active.id, ticketId);
  if (!ticket) notFound();
  const members = await listSupportMembers(supabase, active.id);
  const customer = Array.isArray(ticket.customers)
    ? ticket.customers[0]
    : ticket.customers;
  return (
    <div className="support-page">
      <Link
        href={listReturnHref('tickets', query.returnTo)}
        className="back-link"
      >
        ← Tickets
      </Link>
      <div className="page-heading">
        <p className="eyebrow">TICKET #{ticket.ticket_number}</p>
        <h1>{ticket.title}</h1>
        <p className="page-intro">
          {customer?.name || 'No requester'} · Created{' '}
          <Timestamp value={ticket.created_at} timezone={active.timezone} />
        </p>
      </div>
      <p className="support-row-meta">
        <StatusChip value={ticket.status} /> · Priority:{' '}
        <StatusChip value={ticket.priority} /> · Owner:{' '}
        {assigneeLabel(ticket.assignee_user_id, members)}
      </p>
      {active.role !== 'viewer' && (
        <Disclosure label="Edit ticket details">
          <RecordEditForm
            kind="ticket"
            id={ticket.id}
            initial={{
              title: ticket.title,
              description: ticket.description,
              category: ticket.category ?? '',
            }}
            action={updateTicketDetails}
          />
        </Disclosure>
      )}
      <nav className="filter-bar" aria-label="Related records">
        {ticket.customer_id && (
          <Link
            className="quiet-link"
            href={`/app/customers/${ticket.customer_id}`}
          >
            View customer ↗
          </Link>
        )}
        {ticket.conversations && (
          <Link
            className="quiet-link"
            href={`/app/inbox/${ticket.conversations.id}`}
          >
            Original conversation: {ticket.conversations.subject} ↗
          </Link>
        )}
      </nav>
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
                  <strong>{ticketEventLabel(event, members)}</strong>
                  <span>
                    {eventActorLabel(event.actor_user_id, user.id, members)}
                  </span>
                  <Timestamp
                    value={event.created_at}
                    timezone={active.timezone}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <p className="page-intro">No events recorded.</p>
          )}
        </section>
        {active.role !== 'viewer' && (
          <aside className="workspace-card">
            <p className="eyebrow">ROUTING</p>
            <form action={updateTicket} className="form-stack">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input
                type="hidden"
                name="returnTo"
                value={listReturnHref('tickets', query.returnTo)}
              />
              <RoutingFields
                currentUserId={user.id}
                revision={ticket.support_revision}
                kind="ticket"
                status={ticket.status}
                priority={ticket.priority}
                assigneeId={ticket.assignee_user_id}
                members={members}
              />
              <SubmitButton
                idle="Save ticket"
                busy="Saving…"
                className="secondary-button"
              />
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
