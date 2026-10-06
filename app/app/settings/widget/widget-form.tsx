'use client';

import { useActionState } from 'react';
import { initialFormState } from '../../../../lib/action-state';
import { saveWidget } from './actions';

export function WidgetForm({
  origins,
  enabled,
}: {
  origins: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveWidget, initialFormState);
  return (
    <form action={action} className="form-stack">
      <div className="field">
        <label htmlFor="widget-origins">Allowed website origins</label>
        <textarea
          id="widget-origins"
          name="origins"
          rows={4}
          required
          defaultValue={state.values?.origins ?? origins}
          aria-describedby="widget-origins-help"
        />
        <p className="field-help" id="widget-origins-help">
          One exact origin per line. Include the scheme and port when used. Any
          origin not listed is blocked.
        </p>
      </div>
      <label className="check-row">
        <input type="checkbox" name="enabled" defaultChecked={enabled} /> Enable
        website widget
      </label>
      {state.message && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      {state.success && (
        <p className="form-success" role="status">
          {state.success}
        </p>
      )}
      <button type="submit" className="primary-button" disabled={pending}>
        {pending ? 'Saving…' : 'Save widget settings'}
      </button>
    </form>
  );
}
