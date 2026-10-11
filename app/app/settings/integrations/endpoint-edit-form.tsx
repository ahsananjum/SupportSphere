'use client';

import { useActionState } from 'react';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { initialFormState } from '../../../../lib/action-state';
import { webhookEventTypes } from '../../../../lib/integrations/webhook-contract';
import { updateWebhookEndpoint } from './actions';

export function EndpointEditForm({
  endpoint,
}: {
  endpoint: {
    id: string;
    name: string;
    destination_url: string;
    event_types: string[];
    enabled: boolean;
  };
}) {
  const [state, action] = useActionState(
    updateWebhookEndpoint,
    initialFormState,
  );
  return (
    <form action={action} className="stack-form integration-edit-form">
      <input type="hidden" name="endpointId" value={endpoint.id} />
      <label>
        Endpoint name
        <input
          name="name"
          defaultValue={endpoint.name}
          maxLength={120}
          required
        />
      </label>
      <label>
        HTTPS destination
        <input
          name="destinationUrl"
          type="url"
          inputMode="url"
          defaultValue={endpoint.destination_url}
          maxLength={2048}
          required
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
                defaultChecked={endpoint.event_types.includes(type)}
              />
              {type}
            </label>
          ))}
      </fieldset>
      <label className="checkbox-label">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={endpoint.enabled}
        />
        Enable this endpoint
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
        idle="Save endpoint"
        busy="Saving…"
        className="secondary-button"
      />
    </form>
  );
}
