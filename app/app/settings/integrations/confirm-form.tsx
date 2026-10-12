'use client';

import { useActionState, type FormEvent, type ReactNode } from 'react';
import { initialFormState, type FormState } from '../../../../lib/action-state';

export function ConfirmForm({
  action,
  children,
  message,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  message: string;
}) {
  const [state, submit] = useActionState(action, initialFormState);
  function confirm(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }
  return (
    <form action={submit} onSubmit={confirm}>
      <input type="hidden" name="confirm" value="on" />
      {children}
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
    </form>
  );
}
