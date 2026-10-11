'use client';

export default function AnalyticsError({ reset }: { reset: () => void }) {
  return (
    <section className="workspace-card error-state" role="alert">
      <h1>Analytics unavailable</h1>
      <p>We could not read this workspace’s records.</p>
      <button type="button" className="secondary-button" onClick={reset}>
        Retry
      </button>
    </section>
  );
}
