import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { getConversation } from '../../../../lib/support/queries';
import {
  Composer,
  TicketForm,
} from '../../../../components/support/support-forms';
import { updateConversation } from '../../support-actions';

export const metadata = {
  title: 'Conversation',
  description: 'Conversation detail.',
  robots: { index: false, follow: false },
};
export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  const { conversationId } = await params;
  const query = await searchParams;
  if (!active) notFound();
  const conversation = await getConversation(
    supabase,
    active.id,
    conversationId,
  );
  if (!conversation) notFound();
  const customer = Array.isArray(conversation.customers)
    ? conversation.customers[0]
    : conversation.customers;
  return (
    <div className="support-page">
      <Link href="/app/inbox" className="back-link">
        ← Inbox
      </Link>
      <div className="conversation-layout">
        <main className="conversation-main">
          <div className="page-heading">
            <p className="eyebrow">
              CONVERSATION / {conversation.channel.toUpperCase()}
            </p>
            <h1>{conversation.subject}</h1>
            <p className="page-intro">
              {customer?.name || customer?.email || 'Unknown customer'}
            </p>
          </div>
          {query.notice && (
            <p className="form-success" role="status">
              Conversation updated.
            </p>
          )}
          {query.error && (
            <p className="form-error" role="alert">
              We could not update this conversation.
            </p>
          )}
          <ol className="message-list">
            {conversation.messages?.length ? (
              conversation.messages.map((message) => (
                <li
                  key={message.id}
                  className={`message-bubble message-${message.sender_type}`}
                >
                  <div className="message-label">
                    {message.sender_type === 'note'
                      ? 'Internal note'
                      : message.sender_type === 'agent'
                        ? 'You'
                        : 'Customer'}
                  </div>
                  <p>{message.body}</p>
                  <time dateTime={message.created_at}>
                    {new Date(message.created_at).toLocaleString()}
                  </time>
                </li>
              ))
            ) : (
              <li className="empty-state">
                <p>No messages yet. Send the first reply.</p>
              </li>
            )}
          </ol>
          <Composer conversationId={conversation.id} />
        </main>
        <aside className="conversation-inspector">
          <section className="inspector-card">
            <p className="eyebrow">CUSTOMER</p>
            <h2>{customer?.name || 'Unnamed customer'}</h2>
            <p>{customer?.email || 'No email recorded'}</p>
            {customer?.phone && <p>{customer.phone}</p>}
            <Link
              href={`/app/customers/${conversation.customer_id}`}
              className="quiet-link"
            >
              View customer ↗
            </Link>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">ROUTING</p>
            <form action={updateConversation} className="form-stack">
              <input
                type="hidden"
                name="conversationId"
                value={conversation.id}
              />
              <div className="field">
                <label htmlFor="conversation-status">Status</label>
                <select
                  id="conversation-status"
                  name="status"
                  defaultValue={conversation.status}
                >
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="conversation-priority">Priority</label>
                <select
                  id="conversation-priority"
                  name="priority"
                  defaultValue={conversation.priority}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="conversation-assignee">Assignment</label>
                <select
                  id="conversation-assignee"
                  name="assignee"
                  defaultValue={conversation.assignee_user_id ? 'me' : ''}
                >
                  <option value="">Unassigned</option>
                  <option value="me">Assign to me</option>
                </select>
              </div>
              <button className="secondary-button" type="submit">
                Save routing
              </button>
            </form>
          </section>
          <section className="inspector-card">
            <p className="eyebrow">TICKET</p>
            <p className="page-intro">
              Create a durable work item from this conversation.
            </p>
            <TicketForm
              customerId={conversation.customer_id}
              conversationId={conversation.id}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
