import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { markNotificationRead } from '../workspace-actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata: Metadata = {
  title: 'Notifications',
  robots: { index: false, follow: false },
};
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  const params = await searchParams;
  const { data, error } = await supabase
    .from('notifications')
    .select('id,title,body,kind,created_at,read_at')
    .eq('workspace_id', active.id)
    .order('created_at', { ascending: false })
    .limit(50);
  return (
    <div className="notifications-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / ACTIVITY</p>
        <h1>Notifications</h1>
        <p className="page-intro">
          Updates addressed to you in this workspace.
        </p>
      </div>
      {params.notice === 'read' && (
        <p role="status" className="form-success">
          Notification marked as read.
        </p>
      )}
      {params.error && (
        <p role="alert" className="form-error">
          The notification could not be updated. Refresh and try again.
        </p>
      )}
      <section className="workspace-card">
        {error ? (
          <p role="alert">
            Notifications could not be loaded. Refresh to try again.
          </p>
        ) : data?.length ? (
          <ul className="record-list">
            {data.map((item) => (
              <li className="record notification-row" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <time dateTime={item.created_at}>
                    {new Date(item.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </time>
                </div>
                <div>
                  {item.read_at ? (
                    <span className="role-label">Read</span>
                  ) : active.role === 'viewer' ? (
                    <span className="role-label">Unread</span>
                  ) : (
                    <form action={markNotificationRead}>
                      <input
                        type="hidden"
                        name="notificationId"
                        value={item.id}
                      />
                      <SubmitButton
                        idle="Mark read"
                        busy="Saving…"
                        className="secondary-button"
                      />
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>All caught up</h2>
            <p>There are no notifications for you in this workspace yet.</p>
            <Link href="/app" className="secondary-button inline-button">
              Back to overview
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
