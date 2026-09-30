export default function InvitationLoading() {
  return (
    <main
      id="main-content"
      className="invite-shell workspace-card"
      role="status"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-line" />
      <span className="sr-only">Checking invitation…</span>
    </main>
  );
}
