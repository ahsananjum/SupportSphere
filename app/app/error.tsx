'use client';

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="workspace-card" role="alert">
      <h1>Workspace unavailable</h1>
      <p>
        We could not load your workspace. Check your connection and try again.
      </p>
      <button type="button" className="primary-button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
