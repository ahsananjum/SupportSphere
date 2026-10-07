'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initialFormState } from '../../lib/action-state';
import {
  createConversation,
  createCustomer,
  createTicket,
  sendMessage,
} from '../../app/app/support-actions';

function Feedback({ state }: { state: typeof initialFormState }) {
  return state.message ? (
    <p className="form-error" role="alert">
      {state.message}
    </p>
  ) : state.success ? (
    <p className="form-success" role="status">
      {state.success}
    </p>
  ) : null;
}
export function CustomerForm() {
  const [state, action, pending] = useActionState(
    createCustomer,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack support-form">
      <div className="field">
        <label htmlFor="customer-name">Name</label>
        <input
          id="customer-name"
          name="name"
          required
          maxLength={160}
          defaultValue={state.values?.name}
        />
      </div>
      <div className="field">
        <label htmlFor="customer-email">Email</label>
        <input
          id="customer-email"
          name="email"
          type="email"
          maxLength={320}
          defaultValue={state.values?.email}
        />
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
        />
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
        />
      </div>
      <Feedback state={state} />
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
    <form action={action} className="form-stack support-form">
      <input type="hidden" name="customerId" value={customerId} />
      <div className="field">
        <label htmlFor="conversation-subject">Subject</label>
        <input
          id="conversation-subject"
          name="subject"
          required
          maxLength={240}
          defaultValue={state.values?.subject}
        />
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
      <Feedback state={state} />
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
    <form action={action} className="form-stack support-form">
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
        />
      </div>
      <div className="field">
        <label htmlFor="ticket-description">Description</label>
        <textarea
          id="ticket-description"
          name="description"
          rows={5}
          maxLength={40000}
          defaultValue={state.values?.description}
        />
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
      <Feedback state={state} />
      <button className="primary-button" disabled={pending}>
        {pending ? 'Creating…' : 'Create ticket'}
      </button>
    </form>
  );
}
export function Composer({
  conversationId,
  initialBody = '',
}: {
  conversationId: string;
  initialBody?: string;
}) {
  const clientId = useRef(globalThis.crypto.randomUUID());
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const submitMessage = async (
    state: typeof initialFormState,
    formData: FormData,
  ) => {
    formData.set('clientId', clientId.current);
    const next = await sendMessage(state, formData);
    if (next.success) clientId.current = globalThis.crypto.randomUUID();
    return next;
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
    <form action={action} className="composer">
      <input type="hidden" name="conversationId" value={conversationId} />
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
          defaultValue={state.values?.body ?? initialBody}
        />
      </div>
      <label className="check-row">
        <input type="checkbox" name="internal" /> Internal note
      </label>
      <div className="composer-actions">
        <Feedback state={state} />
        <button className="primary-button" disabled={pending}>
          {pending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
