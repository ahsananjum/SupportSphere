'use client';

import { useActionState, useState } from 'react';
import { initialFormState } from '../../../lib/action-state';
import { updateAutomationRule } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';
import { triggerLabels } from '../../../lib/automation/schema';
import type { AutomationRuleRecord } from '../../../lib/automation/schema';

export function RuleEditForm({ rule }: { rule: AutomationRuleRecord }) {
  const [state, action] = useActionState(
    updateAutomationRule,
    initialFormState,
  );
  const actionValue = (rule.actions[0] ?? {
    type: 'notify',
    title: '',
    body: '',
  }) as AutomationRuleRecord['actions'][number] & {
    title?: string;
    body?: string;
    value?: string;
  };
  const [actionType, setActionType] = useState(actionValue.type);
  return (
    <form action={action} className="stack-form">
      <input type="hidden" name="ruleId" value={rule.id} />
      <input type="hidden" name="version" value={rule.version} />
      <label>
        Rule name
        <input name="name" required maxLength={120} defaultValue={rule.name} />
      </label>
      <label>
        Trigger
        <select name="triggerType" defaultValue={rule.trigger_type}>
          {Object.entries(triggerLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label>
          Only when priority is
          <select
            name="conditionPriority"
            defaultValue={rule.conditions?.priority ?? ''}
          >
            <option value="">Any priority</option>
            {['low', 'normal', 'high', 'urgent'].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label>
          Only when status is
          <select
            name="conditionStatus"
            defaultValue={rule.conditions?.status ?? ''}
          >
            <option value="">Any status</option>
            {['open', 'pending', 'closed', 'in_progress', 'resolved'].map(
              (value) => (
                <option key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </option>
              ),
            )}
          </select>
        </label>
        <label>
          Trigger tag ID (required for tag added)
          <input
            name="conditionTagId"
            defaultValue={rule.conditions?.tagId ?? ''}
          />
        </label>
      </div>
      <label>
        Action
        <select
          name="actionType"
          value={actionType}
          onChange={(event) =>
            setActionType(event.target.value as typeof actionType)
          }
        >
          <option value="notify">Notify the support team</option>
          <option value="set_priority">Set priority</option>
          <option value="set_status">Set status</option>
          <option value="create_ticket">Create a ticket</option>
          <option value="invoke_triage">Queue AI triage</option>
          <option value="invoke_ai_draft">Queue an AI draft</option>
        </select>
      </label>
      {(actionType === 'set_priority' || actionType === 'set_status') && (
        <label>
          Action value
          <select
            name="actionValue"
            defaultValue={
              actionValue.value ??
              (actionType === 'set_priority' ? 'urgent' : 'open')
            }
          >
            {(actionType === 'set_priority'
              ? ['urgent', 'high', 'normal', 'low']
              : ['open', 'pending', 'closed', 'in_progress', 'resolved']
            ).map((value) => (
              <option key={value} value={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
      )}
      {actionType === 'notify' && (
        <>
          <label>
            Notification title
            <input
              name="notifyTitle"
              required
              maxLength={120}
              defaultValue={actionValue.title ?? ''}
            />
          </label>
          <label>
            Notification body
            <textarea
              name="notifyBody"
              required
              maxLength={400}
              defaultValue={actionValue.body ?? ''}
            />
          </label>
        </>
      )}
      {actionType === 'create_ticket' && (
        <label>
          Ticket title
          <input
            name="ticketTitle"
            required
            maxLength={240}
            defaultValue={actionValue.title ?? ''}
          />
        </label>
      )}
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
        idle="Save rule version"
        busy="Saving…"
        className="primary-button"
      />
    </form>
  );
}
