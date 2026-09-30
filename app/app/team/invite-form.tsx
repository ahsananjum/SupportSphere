'use client';

import { useActionState } from 'react';
import { createInvitation } from '../actions';
import { initialFormState } from '../../../lib/action-state';

export function InviteForm({ isOwner }: { isOwner: boolean }) {
  const [state, action, pending] = useActionState(
    createInvitation,
    initialFormState,
  );
  return (
    <form action={action} className="invite-form">
      <div className="field">
        <label htmlFor="inviteEmail">Email address</label>
        <input
          id="inviteEmail"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          aria-invalid={Boolean(state.fields?.email)}
          aria-describedby={
            state.fields?.email ? 'inviteEmail-error' : undefined
          }
        />
        {state.fields?.email && (
          <p id="inviteEmail-error" className="field-error">
            {state.fields.email}
          </p>
        )}
      </div>
      <div className="field">
        <label htmlFor="inviteRole">Role</label>
        <select
          id="inviteRole"
          name="role"
          defaultValue={state.values?.role ?? 'agent'}
          aria-invalid={Boolean(state.fields?.role)}
          aria-describedby={state.fields?.role ? 'inviteRole-error' : undefined}
        >
          <option value="viewer">Viewer</option>
          <option value="agent">Agent</option>
          {isOwner && <option value="admin">Admin</option>}
          {isOwner && <option value="owner">Owner</option>}
        </select>
        {state.fields?.role && (
          <p id="inviteRole-error" className="field-error">
            {state.fields.role}
          </p>
        )}
      </div>
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
      <button className="primary-button" type="submit" disabled={pending}>
        {pending ? 'Sending…' : 'Send invitation'}
      </button>
    </form>
  );
}
