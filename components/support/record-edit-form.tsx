'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { initialFormState, type FormState } from '../../lib/action-state';
import { FieldError, FormFeedback } from '../shared/form-feedback';

/** Submit a validated field patch, so a second teammate's untouched edits survive. */
export function RecordEditForm({
  kind,
  id,
  initial,
  action: save,
}: {
  kind: 'customer' | 'ticket';
  id: string;
  initial: Record<string, string>;
  action: (state: FormState, data: FormData) => Promise<FormState>;
}) {
  const initialKey = JSON.stringify(initial);
  const [fields, setFields] = useState({
    received: initialKey,
    values: initial,
    dirty: {} as Record<string, boolean>,
  });
  if (fields.received !== initialKey) {
    const values: Record<string, string> = {},
      dirty: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(initial)) {
      dirty[key] = Boolean(fields.dirty[key] && fields.values[key] !== value);
      values[key] = dirty[key] ? fields.values[key] : value;
    }
    setFields({ received: initialKey, values, dirty });
  }
  const [state, action, pending] = useActionState(
    async (state: FormState, data: FormData) => {
      const changes = Object.fromEntries(
        Object.entries(initial)
          .filter(([key]) => fields.dirty[key])
          .map(([key]) => [key, String(data.get(key) ?? '')]),
      );
      data.set('changes', JSON.stringify(changes));
      try {
        const next = await save(state, data);
        const saved = next.values;
        if (next.success && saved)
          setFields((current) => {
            const dirty = { ...current.dirty };
            for (const key of Object.keys(saved)) dirty[key] = false;
            return {
              ...current,
              values: { ...current.values, ...saved },
              dirty,
            };
          });
        return next;
      } catch {
        return {
          message:
            'We could not confirm this save. Your edits are preserved. Review the record before retrying.',
        };
      }
    },
    initialFormState,
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
  }, [state, router]);
  const labels: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    company: 'Company',
    title: 'Title',
    description: 'Description',
    category: 'Category',
  };
  const limits: Record<string, number> = {
    name: 160,
    email: 320,
    phone: 60,
    company: 160,
    title: 240,
    description: 40000,
    category: 80,
  };
  return (
    <form
      className="form-stack support-form"
      action={action}
      aria-busy={pending}
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="recordId" value={id} />
      {Object.entries(initial).map(([field, value]) => {
        const inputId = `edit-${kind}-${field}`;
        const props = {
          id: inputId,
          name: field,
          value: fields.values[field] ?? value,
          onChange: (
            event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
          ) =>
            setFields((current) => ({
              ...current,
              values: { ...current.values, [field]: event.target.value },
              dirty: {
                ...current.dirty,
                [field]: event.target.value !== initial[field],
              },
            })),
          maxLength: limits[field],
          required: field === 'title',
          readOnly: pending,
          'aria-invalid': Boolean(state.fields?.[field]),
          'aria-describedby': state.fields?.[field]
            ? `${inputId}-error`
            : undefined,
        };
        return (
          <div className="field" key={field}>
            <label htmlFor={inputId}>{labels[field]}</label>
            {field === 'description' ? (
              <textarea {...props} rows={5} />
            ) : (
              <input {...props} type={field === 'email' ? 'email' : 'text'} />
            )}
            <FieldError id={inputId} error={state.fields?.[field]} />
          </div>
        );
      })}
      <FormFeedback state={state} pending={pending} busy="Saving…" />
      <button className="secondary-button" disabled={pending}>
        {pending ? 'Saving…' : `Save ${kind} details`}
      </button>
    </form>
  );
}
