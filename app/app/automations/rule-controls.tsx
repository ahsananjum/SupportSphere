'use client';

import { useActionState } from 'react';
import { initialFormState } from '../../../lib/action-state';
import { toggleAutomationRule, deleteAutomationRule } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export function RuleControls({
  ruleId,
  enabled,
  name,
}: {
  ruleId: string;
  enabled: boolean;
  name: string;
}) {
  const [toggleState, toggle] = useActionState(
    toggleAutomationRule,
    initialFormState,
  );
  const [deleteState, remove] = useActionState(
    deleteAutomationRule,
    initialFormState,
  );
  return (
    <div className="record-actions">
      <form action={toggle}>
        <input type="hidden" name="ruleId" value={ruleId} />
        <SubmitButton
          idle={enabled ? 'Disable' : 'Enable'}
          busy="Saving…"
          className="secondary-button"
        />
      </form>
      <form action={remove} className="confirm-form">
        <input type="hidden" name="ruleId" value={ruleId} />
        <label>
          <input
            type="checkbox"
            name="confirm"
            required
            aria-label={`Confirm deletion of ${name}`}
          />{' '}
          Confirm deletion
        </label>
        <SubmitButton
          idle="Delete"
          busy="Deleting…"
          className="danger-button"
        />
      </form>
      {(toggleState.message || deleteState.message) && (
        <p className="form-error" role="alert">
          {toggleState.message || deleteState.message}
        </p>
      )}
      {toggleState.success && (
        <p className="form-success" role="status">
          {toggleState.success}
        </p>
      )}
    </div>
  );
}
