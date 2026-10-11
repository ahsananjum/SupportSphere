'use client';

import { useActionState } from 'react';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { initialFormState } from '../../../../lib/action-state';
import { rotateWebhookSecret } from './actions';

export function SecretRotateForm({ endpointId }: { endpointId: string }) {
  const [state, action] = useActionState(rotateWebhookSecret, initialFormState);
  return (
    <form action={action} className="secret-rotate-form">
      <input type="hidden" name="endpointId" value={endpointId} />
      <SubmitButton
        idle="Rotate signing secret"
        busy="Rotating…"
        className="secondary-button"
      />
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
      {state.secret && (
        <textarea
          readOnly
          value={state.secret}
          aria-label="New webhook signing secret"
          rows={2}
        />
      )}
    </form>
  );
}
