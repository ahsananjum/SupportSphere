'use client';

import { useActionState } from 'react';
import { initialFormState } from '../../../../lib/action-state';
import { retryWebhookDelivery } from './actions';
import { SubmitButton } from '../../../../components/shared/submit-button';

export function RetryDeliveryForm({ deliveryId }: { deliveryId: string }) {
  const [state, action] = useActionState(
    retryWebhookDelivery,
    initialFormState,
  );
  return (
    <form action={action}>
      <input type="hidden" name="deliveryId" value={deliveryId} />
      <SubmitButton
        idle="Retry delivery"
        busy="Queueing…"
        className="secondary-button"
      />
      {state.message && (
        <span role="alert" className="form-error">
          {state.message}
        </span>
      )}
      {state.success && (
        <span role="status" className="form-success">
          {state.success}
        </span>
      )}
    </form>
  );
}
