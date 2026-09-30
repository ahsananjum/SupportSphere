'use client';

import { useActionState } from 'react';
import { createWorkspace } from './actions';
import { initialFormState } from '../../lib/action-state';

export function CreateWorkspaceForm() {
  const [state, action, pending] = useActionState(
    createWorkspace,
    initialFormState,
  );
  return (
    <form action={action} className="form-stack">
      <div className="field">
        <label htmlFor="name">Workspace name</label>
        <input
          id="name"
          name="name"
          defaultValue={state.values?.name}
          minLength={2}
          maxLength={100}
          required
          aria-invalid={Boolean(state.fields?.name)}
          aria-describedby={state.fields?.name ? 'name-error' : undefined}
        />
        {state.fields?.name && (
          <p id="name-error" className="field-error">
            {state.fields.name}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="slug">Workspace URL slug</label>
        <input
          id="slug"
          name="slug"
          defaultValue={state.values?.slug}
          minLength={3}
          maxLength={48}
          pattern="[a-z0-9][a-z0-9-]*[a-z0-9]"
          required
          aria-invalid={Boolean(state.fields?.slug)}
          aria-describedby={state.fields?.slug ? 'slug-error' : 'slug-help'}
        />
        <p id="slug-help" className="field-help">
          Lowercase letters, numbers, and hyphens.
        </p>
        {state.fields?.slug && (
          <p id="slug-error" className="field-error">
            {state.fields.slug}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="timezone">Timezone</label>
        <input
          id="timezone"
          name="timezone"
          defaultValue={state.values?.timezone ?? 'UTC'}
          maxLength={100}
          required
          aria-invalid={Boolean(state.fields?.timezone)}
          aria-describedby={
            state.fields?.timezone ? 'timezone-error' : undefined
          }
        />
        {state.fields?.timezone && (
          <p id="timezone-error" className="field-error">
            {state.fields.timezone}
          </p>
        )}
      </div>
      {state.message && (
        <p role="alert" className="form-error">
          {state.message}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? 'Creating workspace…' : 'Create workspace'}
      </button>
    </form>
  );
}
