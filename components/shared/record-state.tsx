import type { ReactNode } from 'react';
import { statusLabel, timestampLabel } from '../../lib/ui/presentation';
import styles from './record-state.module.css';

export function StatusChip({ value }: { value: string | null | undefined }) {
  const tone = ['failed', 'urgent'].includes(value ?? '')
    ? 'danger'
    : ['high', 'pending', 'retrying', 'escalated'].includes(value ?? '')
      ? 'warning'
      : ['ready', 'completed', 'succeeded', 'resolved'].includes(value ?? '')
        ? 'success'
        : 'neutral';
  return (
    <span className={`${styles.chip} ${styles[tone]}`}>
      {statusLabel(value)}
    </span>
  );
}
export function Timestamp({
  value,
  timezone = 'UTC',
}: {
  value: string;
  timezone?: string;
}) {
  const label = timestampLabel(value, timezone);
  return label ? (
    <time
      className={styles.time}
      dateTime={value}
      title={`${label} (${timezone})`}
    >
      {label} <span>{timezone}</span>
    </time>
  ) : (
    <span className={styles.time}>Time unavailable</span>
  );
}
export function StatePanel({
  title,
  children,
  kind = 'empty',
  actions,
  level = 2,
}: {
  title: string;
  children?: ReactNode;
  kind?: 'empty' | 'error' | 'loading' | 'permission';
  actions?: ReactNode;
  level?: 1 | 2;
}) {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <section
      className={styles.panel}
      role={
        kind === 'error' ? 'alert' : kind === 'loading' ? 'status' : undefined
      }
      aria-busy={kind === 'loading' || undefined}
    >
      <Heading className={styles.heading}>{title}</Heading>
      {children && <div className={styles.body}>{children}</div>}
      {kind === 'loading' && (
        <div aria-hidden="true">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-line" />
        </div>
      )}
      {actions && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
