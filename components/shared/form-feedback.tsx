import type { FormState } from '../../lib/action-state';

/** Both help and error remain associated with the actual control. */
export function fieldDescription(id: string, error?: string, help?: string) {
  return (
    [help && `${id}-help`, error && `${id}-error`].filter(Boolean).join(' ') ||
    undefined
  );
}

export function FieldError({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={`${id}-error`} className="field-error" role="alert">
      {error}
    </p>
  ) : null;
}

export function FormFeedback({
  state,
  pending = false,
  busy = 'Saving changes…',
}: {
  state: FormState;
  pending?: boolean;
  busy?: string;
}) {
  return (
    <>
      {state.message && !pending && (
        <p className="form-error" role="alert">
          {state.message}
        </p>
      )}
      <div role="status" aria-live="polite" aria-atomic="true">
        {pending ? (
          <p className="field-help">{busy}</p>
        ) : state.success ? (
          <p className="form-success">{state.success}</p>
        ) : null}
      </div>
    </>
  );
}
