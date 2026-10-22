import { RoutingFields } from '../../../../components/support/routing-fields';
import { listReturnHref } from '../../../../lib/support/list-navigation';
import { listTickets } from '../../../../lib/support/queries';
import { AutomatedActionState } from '../../../../components/shared/automated-action-state';
import { safeActionReason } from '../../../../lib/ui/automated-action';
import Link from 'next/link';
import { assigneeLabel } from '../../../../lib/support/presentation';
import { listSupportMembers } from '../../../../lib/support/queries';
import {
  StatusChip,
  Timestamp,
} from '../../../../components/shared/record-state';
import { PageHeading } from '../../../../components/shared/page-heading';
import { messageAuthorLabel } from '../../../../lib/support/presentation';
import { notFound } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { getConversation } from '../../../../lib/support/queries';
import {
  Composer,
  TicketForm,
} from '../../../../components/support/support-forms';
import { updateConversation } from '../../support-actions';
import { InboxRealtime } from '../../../../components/support/inbox-realtime';
import { releaseAiHandoff } from '../../ai/actions';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { readRunEvidence } from '../../../../lib/ai/evidence';
import { AiEvidence } from '../../../../components/ai/run-evidence';
import { ConfirmationForm } from '../../../../components/shared/confirmation-form';
import { aiModeLabel } from '../../../../lib/ai/policy';

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
  searchParams: Promise<{
    notice?: string;
    error?: string;
    returnTo?: string | string[];
  }>;
}) {
  const { supabase, active, user } = await getWorkspaceContext();
  const { conversationId } = await params;
  const query = await searchParams;
  if (!active) notFound();
  const conversation = await getConversation(
    supabase,
    active.id,
    conversationId,
  );
  if (!conversation) notFound();
  const linkedTickets = await listTickets(supabase, active.id, {
    conversationId,
  });
  const { data: aiRuns, error: aiError } = await supabase
    .from('ai_runs')
    .select(
      'id,status,decision,reason_code,output_text,created_at,run_type,attempt',
    )
    .eq('workspace_id', active.id)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1);
  const members = await listSupportMembers(supabase, active.id);
  const latestAiRun = aiRuns?.[0];
  const policy = await supabase
    .from('ai_agent_configs')
    .select('mode,version')
    .eq('workspace_id', active.id)
    .maybeSingle();
  const evidence = latestAiRun
    ? await readRunEvidence(supabase, active.id, latestAiRun.id)
    : null;
  const customer = Array.isArray(conversation.customers)
    ? conversation.customers[0]
    : conversation.customers;
  return (
    <div className="support-page">
      <Link
        href={listReturnHref('inbox', query.returnTo)}
        className="back-link"
      >
        ← Inbox
      </Link>
      <div className="conversation-layout">
        <section
          className="conversation-main"
          aria-label="Conversation timeline"
        >
          <PageHeading
            title={conversation.subject}
            eyebrow={`CONVERSATION / ${conversation.channel.toUpperCase()}`}
            description={
              customer?.name || customer?.email || 'Unknown customer'
            }
          />
          <p className="support-row-meta">
            <StatusChip value={conversation.status} /> · Priority:{' '}
            <StatusChip value={conversation.priority} /> · Owner:{' '}
            {assigneeLabel(conversation.assignee_user_id, members)}
          </p>
          <InboxRealtime
            workspaceId={active.id}
            conversationId={conversation.id}
          />
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
          {conversation.ai_handoff_at && (
            <section className="workspace-card ai-handoff" role="status">
              <h2>Human support requested</h2>
              <p>
                {safeActionReason(conversation.ai_handoff_reason) ??
                  'Review this conversation before releasing the handoff.'}
              </p>
              <p>
                Human review is required. Releasing the handoff permits future
                AI work under the current policy; it does not send a reply.
              </p>
              <p>
                Release does not replay old questions or clear assignment. Only
                a new eligible customer message can resume AI; assigned or
                closed conversations still block automatic replies.
              </p>
              <p className="field-help">
                {policy.data
                  ? `Current policy: ${aiModeLabel(policy.data.mode)} (version ${policy.data.version}).`
                  : 'Current policy could not be loaded. Review AI policy before expecting new work.'}
              </p>
              {['owner', 'admin', 'agent'].includes(active.role) && (
                <ConfirmationForm
                  action={releaseAiHandoff}
                  message={`Release AI handoff for “${conversation.subject}”? This permits future eligible messages under the latest policy. It does not send, replay a question or clear assignment.`}
                >
                  <input
                    type="hidden"
                    name="conversationId"
                    value={conversation.id}
                  />
                  <SubmitButton
                    idle="Release AI handoff"
                    busy="Releasing…"
                    className="secondary-button"
                  />
                </ConfirmationForm>
              )}
            </section>
          )}
          <ol className="message-list">
            {conversation.messages?.length ? (
              conversation.messages.map((message) => (
                <li
                  key={message.id}
                  className={`message-bubble message-${message.sender_type}`}
                >
                  <div className="message-label">
                    {messageAuthorLabel(message, user.id)}
                  </div>
                  <p>{message.body}</p>
                  <span className="field-help">
                    {message.sender_type === 'note'
                      ? 'Team only'
                      : message.sender_type === 'customer'
                        ? 'Customer message'
                        : 'Public reply'}{' '}
                    ·{' '}
                    {message.delivery_status === 'sent'
                      ? 'Saved'
                      : message.delivery_status === 'failed'
                        ? 'Delivery failed'
                        : 'Delivery pending'}
                  </span>
                  <Timestamp
                    value={message.created_at}
                    timezone={active.timezone}
                  />
                </li>
              ))
            ) : (
              <li className="empty-state">
                <p>No messages yet. Send the first reply.</p>
              </li>
            )}
          </ol>
          {aiError && (
            <p role="alert" className="form-error">
              AI status could not be loaded. Refresh to retry.
            </p>
          )}
          {latestAiRun && (
            <section className="workspace-card ai-suggestion">
              <AutomatedActionState
                kind="ai"
                run={latestAiRun}
                heading
                announce
              />
              {latestAiRun.status === 'completed' &&
                latestAiRun.decision === 'draft' &&
                latestAiRun.output_text && (
                  <p className="ai-output">{latestAiRun.output_text}</p>
                )}
              <Link
                className="quiet-link"
                href={'/app/ai/runs/' + latestAiRun.id}
              >
                Inspect run and citations ↗
              </Link>
              {evidence && <AiEvidence evidence={evidence} />}
            </section>
          )}
          {active.role !== 'viewer' ? (
            <Composer
              key={conversation.id}
              recipient={customer?.name || customer?.email || 'this customer'}
              conversationId={conversation.id}
              draftRunId={`${latestAiRun?.id ?? ''}:${policy.data?.version ?? 'unavailable'}:${policy.data?.mode ?? ''}`}
              initialBody={
                latestAiRun?.status === 'completed' &&
                latestAiRun.decision === 'draft'
                  ? (latestAiRun.output_text ?? '')
                  : ''
              }
            />
          ) : (
            <p className="field-help">
              Your viewer role can read this conversation. Contact a workspace
              admin for permission to reply.
            </p>
          )}
        </section>
        <aside className="conversation-inspector">
          <section className="inspector-card">
            <h2>Linked tickets</h2>
            {linkedTickets.rows.length ? (
              <ul className="support-list compact-list">
                {linkedTickets.rows.map((ticket) => (
                  <li key={ticket.id} className="support-row">
                    <Link href={`/app/tickets/${ticket.id}`}>
                      #{ticket.ticket_number} · {ticket.title}{' '}
                      <StatusChip value={ticket.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No linked tickets yet.</p>
            )}
            <Link
              className="quiet-link"
              href={`/app/tickets?conversation=${conversation.id}`}
            >
              View all {linkedTickets.count} linked tickets ↗
            </Link>
          </section>
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
          {active.role !== 'viewer' && (
            <>
              <section className="inspector-card">
                <p className="eyebrow">ROUTING</p>
                <form action={updateConversation} className="form-stack">
                  <input
                    type="hidden"
                    name="conversationId"
                    value={conversation.id}
                  />
                  <input
                    type="hidden"
                    name="returnTo"
                    value={listReturnHref('inbox', query.returnTo)}
                  />
                  <RoutingFields
                    currentUserId={user.id}
                    revision={conversation.support_revision}
                    kind="conversation"
                    status={conversation.status}
                    priority={conversation.priority}
                    assigneeId={conversation.assignee_user_id}
                    members={members}
                  />
                  <SubmitButton
                    idle="Save routing"
                    busy="Saving…"
                    className="secondary-button"
                  />
                </form>
              </section>
            </>
          )}
          {active.role !== 'viewer' && (
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
          )}
        </aside>
      </div>
    </div>
  );
}
