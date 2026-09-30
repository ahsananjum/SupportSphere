export default function TeamLoading() {
  return (
    <div className="workspace-card" role="status" aria-live="polite">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <span className="sr-only">Loading team…</span>
    </div>
  );
}
