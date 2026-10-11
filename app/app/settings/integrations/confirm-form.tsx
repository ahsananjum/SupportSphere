'use client';

import type { FormEvent, ReactNode } from 'react';

export function ConfirmForm({
  action,
  children,
  message,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  message: string;
}) {
  function confirm(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }
  return (
    <form action={action} onSubmit={confirm}>
      {children}
    </form>
  );
}
