'use client';
import { DraftAdoption } from '../ai/draft-adoption';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormFeedback, FieldError } from '../shared/form-feedback';
import { initialFormState } from '../../lib/action-state';
import {
  createConversation,
  createCustomer,
  createTicket,
  sendMessage,
} from '../../app/app/support-actions';

export function CustomerForm() {
  const [state, action, pending] = useActionState(
    createCustomer,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack support-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <div className="field">
        <label htmlFor="customer-name">Name</label>
        <input
          id="customer-name"
          name="name"
          required
          maxLength={160}
          defaultValue={state.values?.name}
          aria-invalid={Boolean(state.fields?.name)}
          aria-describedby={
            state.fields?.name ? 'customer-name-error' : undefined
          }
        />
        <FieldError id="customer-name" error={state.fields?.name} />
      </div>
      <div className="field">
        <label htmlFor="customer-email">Email</label>
        <input
          id="customer-email"
          name="email"
          type="email"
          maxLength={320}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.fields?.email)}
          aria-describedby={
            state.fields?.email ? 'customer-email-error' : undefined
          }
        />
        <FieldError id="customer-email" error={state.fields?.email} />
      </div>
      <div className="field">
        <label htmlFor="customer-phone">
          Phone <span className="field-help">optional</span>
        </label>
        <input
          id="customer-phone"
          name="phone"
          maxLength={60}
          defaultValue={state.values?.phone}
          aria-invalid={Boolean(state.fields?.phone)}
          aria-describedby={
            state.fields?.phone ? 'customer-phone-error' : undefined
          }
        />
        <FieldError id="customer-phone" error={state.fields?.phone} />
      </div>
      <div className="field">
        <label htmlFor="customer-company">
          Company <span className="field-help">optional</span>
        </label>
        <input
          id="customer-company"
          name="company"
          maxLength={160}
          defaultValue={state.values?.company}
          aria-invalid={Boolean(state.fields?.company)}
          aria-describedby={
            state.fields?.company ? 'customer-company-error' : undefined
          }
        />
        <FieldError id="customer-company" error={state.fields?.company} />
      </div>
      <FormFeedback state={state} pending={pending} busy="Saving…" />
      <button className="primary-button" disabled={pending}>
        {pending ? 'Saving…' : 'Save customer'}
      </button>
    </form>
  );
}
export function ConversationForm({ customerId }: { customerId: string }) {
  const [state, action, pending] = useActionState(
    createConversation,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack support-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <div className="field">
        <label htmlFor="conversation-subject">Subject</label>
        <input
          id="conversation-subject"
          name="subject"
          required
          maxLength={240}
          defaultValue={state.values?.subject}
          aria-invalid={Boolean(state.fields?.subject)}
          aria-describedby={
            state.fields?.subject ? 'conversation-subject-error' : undefined
          }
        />
        <FieldError id="conversation-subject" error={state.fields?.subject} />
      </div>
      <div className="field">
        <label htmlFor="conversation-channel">Channel</label>
        <select id="conversation-channel" name="channel" defaultValue="manual">
          <option value="manual">Manual</option>
          <option value="email">Email</option>
          <option value="widget">Widget</option>
          <option value="api">API</option>
        </select>
      </div>
      <FormFeedback state={state} pending={pending} busy="Saving…" />
      <button className="primary-button" disabled={pending}>
        {pending ? 'Starting…' : 'Start conversation'}
      </button>
    </form>
  );
}
export function TicketForm({
  customerId = '',
  conversationId = '',
}: {
  customerId?: string;
  conversationId?: string;
}) {
  const [state, action, pending] = useActionState(
    createTicket,
    initialFormState,
  );
  return (
    <form
      action={action}
      className="form-stack support-form"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="customerId" value={customerId} />
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="field">
        <label htmlFor="ticket-title">Title</label>
        <input
          id="ticket-title"
          name="title"
          required
          maxLength={240}
          defaultValue={state.values?.title}
          aria-invalid={Boolean(state.fields?.title)}
          aria-describedby={
            state.fields?.title ? 'ticket-title-error' : undefined
          }
        />
        <FieldError id="ticket-title" error={state.fields?.title} />
      </div>
      <div className="field">
        <label htmlFor="ticket-description">Description</label>
        <textarea
          id="ticket-description"
          name="description"
          rows={5}
          maxLength={40000}
          defaultValue={state.values?.description}
          aria-invalid={Boolean(state.fields?.description)}
          aria-describedby={
            state.fields?.description ? 'ticket-description-error' : undefined
          }
        />
        <FieldError id="ticket-description" error={state.fields?.description} />
      </div>
      <div className="field">
        <label htmlFor="ticket-priority">Priority</label>
        <select
          id="ticket-priority"
          name="priority"
          defaultValue={state.values?.priority ?? 'normal'}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="ticket-category">
          Category <span className="field-help">optional</span>
        </label>
        <input
          id="ticket-category"
          name="category"
          maxLength={80}
          defaultValue={state.values?.category}
        />
      </div>
      <FormFeedback state={state} pending={pending} busy="Saving…" />
      <button className="primary-button" disabled={pending}>
        {pending ? 'Creating…' : 'Create ticket'}
      </button>
    </form>
  );
}
export function Composer({
  conversationId,
  initialBody = '',
  recipient = 'this customer',
  draftRunId = '',
}: {
  conversationId: string;
  initialBody?: string;
  recipient?: string;
  draftRunId?: string;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const submission = useRef<{ payload: string; id: string } | null>(null);
  const submitMessage = async (
    state: typeof initialFormState,
    formData: FormData,
  ) => {
    const sentBody = String(formData.get('body') ?? '');
    const payload = JSON.stringify([sentBody, formData.get('internal')]);
    if (submission.current?.payload !== payload)
      submission.current = { payload, id: globalThis.crypto.randomUUID() };
    formData.set('clientId', submission.current.id);
    try {
      const next = await sendMessage(state, formData);
      if (next.success) {
        submission.current = null;
        setBody((current) => (current === sentBody ? '' : current));
      }
      return next;
    } catch {
      return {
        message:
          'We could not confirm this send. Your draft is preserved. Retry to check the same message.',
      };
    }
  };
  const [state, action, pending] = useActionState(
    submitMessage,
    initialFormState,
  );
  const router = useRouter();
  useEffect(() => {
    if (!state.success) return;
    router.refresh();
  }, [router, state.success]);
  return (
    <form
      action={action}
      className="composer"
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <p
        className={internal ? 'form-notice' : 'field-help'}
        id="composer-audience"
        role="status"
      >
        {internal
          ? 'Internal note · Only your workspace team can see this.'
          : `Public reply · Visible to ${recipient} in this conversation.`}
      </p>
      <div className="field">
        <label htmlFor="message-body">Reply</label>
        <textarea
          ref={bodyRef}
          id="message-body"
          name="body"
          rows={4}
          required
          maxLength={20000}
          placeholder="Write a clear, helpful reply…"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          readOnly={pending}
          aria-invalid={Boolean(state.fields?.body)}
          aria-describedby={
            state.fields?.body
              ? 'composer-audience message-body-error'
              : 'composer-audience'
          }
        />
        <FieldError id="message-body" error={state.fields?.body} />
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          name="internal"
          checked={internal}
          onChange={(event) => setInternal(event.target.checked)}
          disabled={pending}
        />{' '}
        Internal note
      </label>
      {initialBody && (
        <DraftAdoption
          draft={initialBody}
          runId={draftRunId}
          body={body}
          pending={pending}
          onAdopt={(text) => {
            setBody(text);
            bodyRef.current?.focus();
          }}
        />
      )}
      <div className="composer-actions">
        <FormFeedback state={state} pending={pending} busy="Saving…" />
        <button className="primary-button" disabled={pending}>
          {pending
            ? internal
              ? 'Saving note…'
              : 'Sending…'
            : internal
              ? 'Save internal note'
              : 'Send message'}
        </button>
      </div>
    </form>
  );
}
