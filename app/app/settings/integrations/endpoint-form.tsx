'use client';

import { useActionState } from 'react';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { initialFormState } from '../../../../lib/action-state';
import { createWebhookEndpoint } from './actions';
import { webhookEventTypes } from '../../../../lib/integrations/webhook-contract';

export function EndpointForm() {
  const [state, action] = useActionState(
    createWebhookEndpoint,
    initialFormState,
  );
  return (
    <form action={action} className="stack-form">
      <label>
        Endpoint name
        <input
          name="name"
          required
          maxLength={120}
          placeholder="Support events"
        />
      </label>
      <label>
        Destination URL
        <input
          name="destinationUrl"
          required
          type="url"
          inputMode="url"
          placeholder="https://example.com/supportsphere"
        />
      </label>
      <fieldset className="checkbox-group">
        <legend>Events</legend>
        {webhookEventTypes
          .filter((type) => type !== 'webhook.test')
          .map((type) => (
            <label className="checkbox-label" key={type}>
              <input
                type="checkbox"
                name="eventTypes"
                value={type}
                defaultChecked
              />
              {type}
            </label>
          ))}
      </fieldset>
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
        <div className="secret-reveal">
          <strong>Signing secret (copy now)</strong>
          <textarea
            readOnly
            value={state.secret}
            aria-label="Webhook signing secret"
            rows={2}
          />
        </div>
      )}
      <SubmitButton
        idle="Connect endpoint"
        busy="Connecting…"
        className="primary-button"
      />
    </form>
  );
}
