'use client';

import { useActionState, useState } from 'react';
import { initialFormState } from '../../../lib/action-state';
import { createAutomationRule } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export function AutomationForm() {
  const [actionType, setActionType] = useState('notify');
  const [state, action] = useActionState(
    createAutomationRule,
    initialFormState,
  );
  return (
    <section className="workspace-card automation-form-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NEW RULE</p>
          <h2>Route a support event</h2>
        </div>
      </div>
      <form action={action} className="stack-form">
        <label>
          Rule name
          <input
            name="name"
            required
            maxLength={120}
            placeholder="Urgent conversations"
            defaultValue={state.values?.name}
          />
        </label>
        <label>
          Trigger
          <select name="triggerType" defaultValue="customer_message_received">
            <option value="conversation_created">Conversation created</option>
            <option value="customer_message_received">
              Customer message received
            </option>
            <option value="ticket_created">Ticket created</option>
            <option value="priority_changed">Priority changed</option>
            <option value="tag_added">Tag added</option>
            <option value="escalation">Escalation</option>
          </select>
        </label>
        <div className="form-grid">
          <label>
            Only when priority is
            <select name="conditionPriority" defaultValue="">
              <option value="">Any priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label>
            Only when status is
            <select name="conditionStatus" defaultValue="">
              <option value="">Any status</option>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
        </div>
        <label>
          Action
          <select
            name="actionType"
            value={actionType}
            onChange={(event) => setActionType(event.target.value)}
          >
            <option value="notify">Notify the support team</option>
            <option value="set_priority">Set priority</option>
            <option value="set_status">Set status</option>
            <option value="create_ticket">Create a ticket</option>
            <option value="invoke_triage">Queue AI triage</option>
            <option value="invoke_ai_draft">Queue AI draft</option>
          </select>
        </label>
        {(actionType === 'set_priority' || actionType === 'set_status') && (
          <label>
            Action value (for priority/status)
            <select
              key={actionType}
              name="actionValue"
              defaultValue={actionType === 'set_priority' ? 'urgent' : 'open'}
            >
              {(actionType === 'set_priority'
                ? ['urgent', 'high', 'normal', 'low']
                : ['open', 'pending', 'closed', 'in_progress', 'resolved']
              ).map((value) => (
                <option value={value} key={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </label>
        )}
        {actionType === 'create_ticket' && (
          <>
            <label>
              Ticket title
              <input
                name="ticketTitle"
                required
                maxLength={240}
                defaultValue={state.values?.ticketTitle}
              />
            </label>
            <label>
              Ticket description
              <textarea
                name="ticketDescription"
                maxLength={40000}
                defaultValue={state.values?.ticketDescription}
              />
            </label>
            <label>
              Ticket priority
              <select name="ticketPriority" defaultValue="normal">
                {['low', 'normal', 'high', 'urgent'].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {actionType === 'notify' && (
          <>
            <label>
              Notification title
              <input
                name="notifyTitle"
                maxLength={120}
                placeholder="Automation matched"
                required
                defaultValue={state.values?.notifyTitle}
              />
            </label>
            <label>
              Notification body
              <textarea
                name="notifyBody"
                maxLength={400}
                placeholder="A support event matched this rule."
                required
                defaultValue={state.values?.notifyBody}
              />
            </label>
          </>
        )}
        <label className="checkbox-label">
          <input type="checkbox" name="enabled" defaultChecked />
          Run this rule when matching events arrive
        </label>
        {state.message && (
          <p role="alert" className="form-error">
            {state.message}
          </p>
        )}
        {state.success && (
          <p role="status" className="form-success">
            {state.success}
          </p>
        )}
        <SubmitButton
          idle="Save automation"
          busy="Saving…"
          className="primary-button"
        />
      </form>
    </section>
  );
}
