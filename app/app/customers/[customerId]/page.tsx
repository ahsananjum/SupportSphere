import { RecordEditForm } from '../../../../components/support/record-edit-form';
import { Disclosure } from '../../../../components/shared/disclosure';
import { updateCustomerDetails } from '../../support-actions';
import { listReturnHref } from '../../../../lib/support/list-navigation';
import {
  StatusChip,
  Timestamp,
} from '../../../../components/shared/record-state';
import { statusLabel } from '../../../../lib/ui/presentation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { getCustomer } from '../../../../lib/support/queries';
import { ConversationForm } from '../../../../components/support/support-forms';

export const metadata = {
  title: 'Customer',
  description: 'Customer profile.',
  robots: { index: false, follow: false },
};
export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  const { customerId } = await params;
  const query = await searchParams;
  if (!active) notFound();
  const customer = await getCustomer(supabase, active.id, customerId);
  if (!customer) notFound();
  return (
    <div className="support-page">
      <Link
        href={listReturnHref('customers', query.returnTo)}
        className="back-link"
      >
        ← Customers
      </Link>
      <div className="page-heading">
        <p className="eyebrow">CUSTOMER PROFILE</p>
        <h1>{customer.name || 'Unnamed customer'}</h1>
        <p className="page-intro">
          {customer.email || 'No email recorded'}
          {customer.company ? ` · ${customer.company}` : ''}
        </p>
      </div>
      {active.role !== 'viewer' && (
        <Disclosure label="Edit customer details">
          <RecordEditForm
            kind="customer"
            id={customer.id}
            initial={{
              name: customer.name,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              company: customer.company ?? '',
            }}
            action={updateCustomerDetails}
          />
        </Disclosure>
      )}
      <div className="detail-grid">
        <section className="workspace-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONVERSATIONS</p>
              <h2>Conversation history</h2>
            </div>
            <span className="support-count">{customer.conversationCount}</span>
          </div>
          {customer.conversations?.length ? (
            <ul className="support-list compact-list">
              {customer.conversations.map((conversation) => (
                <li key={conversation.id} className="support-row">
                  <Link href={`/app/inbox/${conversation.id}`}>
                    <span className="support-row-top">
                      <strong>{conversation.subject}</strong>
                      <StatusChip value={conversation.status} />
                    </span>
                    <span className="support-row-meta">
                      {statusLabel(conversation.priority)} ·{' '}
                      <Timestamp
                        value={conversation.updated_at}
                        timezone={active.timezone}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-intro">No conversations yet.</p>
          )}
          <Link
            className="quiet-link"
            href={`/app/inbox?customer=${customer.id}`}
          >
            View all customer conversations ↗
          </Link>
        </section>
        <section className="workspace-card">
          <div className="section-heading">
            <h2>Ticket history</h2>
            <span className="support-count">{customer.ticketCount}</span>
          </div>
          {customer.tickets.length ? (
            <ul className="support-list compact-list">
              {customer.tickets.map((ticket) => (
                <li key={ticket.id} className="support-row">
                  <Link href={`/app/tickets/${ticket.id}`}>
                    <span className="support-row-top">
                      <strong>
                        #{ticket.ticket_number} · {ticket.title}
                      </strong>
                      <StatusChip value={ticket.status} />
                    </span>
                    <span className="support-row-meta">
                      {statusLabel(ticket.priority)} ·{' '}
                      <Timestamp
                        value={ticket.updated_at}
                        timezone={active.timezone}
                      />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-intro">No tickets yet.</p>
          )}
          <Link
            className="quiet-link"
            href={`/app/tickets?customer=${customer.id}`}
          >
            View all customer tickets ↗
          </Link>
        </section>
        {active.role !== 'viewer' && (
          <aside className="workspace-card">
            <p className="eyebrow">NEW THREAD</p>
            <h2>Start a conversation</h2>
            <ConversationForm customerId={customer.id} />
          </aside>
        )}
      </div>
    </div>
  );
}
