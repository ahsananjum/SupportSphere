'use client';

import { useActionState, type ReactNode } from 'react';
import { ConfirmationForm } from '../../../../components/shared/confirmation-form';
import { FormFeedback } from '../../../../components/shared/form-feedback';
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
  const [state, submit, pending] = useActionState(action, initialFormState);
  return (
    <ConfirmationForm action={submit} message={message}>
      <input type="hidden" name="confirm" value="on" />
      {children}
      <FormFeedback state={state} pending={pending} />
    </ConfirmationForm>
  );
}
