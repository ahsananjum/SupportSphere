'use client';

import { useActionState } from 'react';
import { ConfirmationForm } from '../../../../components/shared/confirmation-form';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { initialFormState } from '../../../../lib/action-state';
import { rotateWebhookSecret } from './actions';

export function SecretRotateForm({
  endpointId,
  endpointName,
}: {
  endpointId: string;
  endpointName: string;
}) {
  const [state, action] = useActionState(rotateWebhookSecret, initialFormState);
  return (
    <ConfirmationForm
      action={action}
      message={`Rotate the signing secret for “${endpointName}”? Update your receiver with the new secret after rotation; the old secret will stop working.`}
    >
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
    </ConfirmationForm>
  );
}
