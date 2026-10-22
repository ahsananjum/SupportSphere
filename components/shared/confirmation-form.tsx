'use client';

import { useId, useRef, type ReactNode } from 'react';
import styles from './confirmation-form.module.css';

/** Native modal isolation and requestSubmit preserve validation and named submitters. */
export function ConfirmationForm({
  action,
  message,
  children,
}: {
  action: (data: FormData) => void | Promise<void>;
  message: string;
  children: ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const submitter = useRef<HTMLButtonElement | HTMLInputElement | null>(null);
  const confirmed = useRef(false);
  const cancel = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    submitter.current?.focus();
  }
  return (
    <form
      ref={form}
      action={action}
      onSubmit={(event) => {
        if (confirmed.current) {
          confirmed.current = false;
          return;
        }
        event.preventDefault();
        submitter.current = (event.nativeEvent as SubmitEvent).submitter as
          HTMLButtonElement | HTMLInputElement | null;
        dialog.current?.showModal();
        cancel.current?.focus();
      }}
    >
      {children}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <h2 id={`${id}-title`}>Confirm action</h2>
        <p id={`${id}-message`}>{message}</p>
        <div className={styles.actions}>
          <button
            ref={cancel}
            type="button"
            className="secondary-button"
            onClick={close}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              close();
              confirmed.current = true;
              form.current?.requestSubmit(submitter.current);
              confirmed.current = false;
            }}
          >
            Confirm
          </button>
        </div>
      </dialog>
    </form>
  );
}
