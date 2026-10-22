'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
export function ReviewRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="secondary-button"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      {pending ? 'Refreshing review…' : 'Refresh review'}
    </button>
  );
}
