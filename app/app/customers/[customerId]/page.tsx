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
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  const { customerId } = await params;
  if (!active) notFound();
  const customer = await getCustomer(supabase, active.id, customerId);
  if (!customer) notFound();
  return (
    <div className="support-page">
      <Link href="/app/customers" className="back-link">
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
      <div className="detail-grid">
        <section className="workspace-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONVERSATIONS</p>
              <h2>Conversation history</h2>
            </div>
            <span className="support-count">
              {customer.conversations?.length ?? 0}
            </span>
          </div>
          {customer.conversations?.length ? (
            <ul className="support-list compact-list">
              {customer.conversations.map((conversation) => (
                <li key={conversation.id} className="support-row">
                  <Link href={`/app/inbox/${conversation.id}`}>
                    <span className="support-row-top">
                      <strong>{conversation.subject}</strong>
                      <span
                        className={`status-chip status-${conversation.status}`}
                      >
                        {conversation.status}
                      </span>
                    </span>
                    <span className="support-row-meta">
                      {conversation.priority} ·{' '}
                      {new Date(conversation.updated_at).toLocaleString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="page-intro">No conversations yet.</p>
          )}
        </section>
        <aside className="workspace-card">
          <p className="eyebrow">NEW THREAD</p>
          <h2>Start a conversation</h2>
          <ConversationForm customerId={customer.id} />
        </aside>
      </div>
    </div>
  );
}
