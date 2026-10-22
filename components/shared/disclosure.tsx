'use client';

import { useRef, type ReactNode } from 'react';
import styles from './disclosure.module.css';

export function Disclosure({
  label,
  children,
  primary = false,
}: {
  label: string;
  children: ReactNode;
  primary?: boolean;
}) {
  const summary = useRef<HTMLElement>(null);
  return (
    <details
      className={styles.disclosure}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !event.currentTarget.open) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.open = false;
        summary.current?.focus();
      }}
    >
      <summary
        ref={summary}
        className={primary ? 'primary-button' : 'secondary-button'}
      >
        {label}
      </summary>
      <div className={styles.panel}>{children}</div>
    </details>
  );
}
