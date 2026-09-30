'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  idle,
  busy,
  className = 'primary-button',
}: {
  idle: string;
  busy: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? busy : idle}
    </button>
  );
}
