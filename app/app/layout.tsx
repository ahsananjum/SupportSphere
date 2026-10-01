import Link from 'next/link';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import { logOut } from '../(auth)/actions';
import { switchWorkspace } from './actions';
import { SubmitButton } from '../../components/shared/submit-button';
import { AppNavigation } from '../../components/shared/app-navigation';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Your private SupportSphere workspace.',
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  const { user, memberships, active } = await getWorkspaceContext();
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link href="/app" className="app-logo">
          SupportSphere<span aria-hidden="true"> ✳</span>
        </Link>
        <AppNavigation hasWorkspace={Boolean(active)} />
        <form action={logOut}>
          <SubmitButton
            idle="Sign out"
            busy="Signing out…"
            className="text-button"
          />
        </form>
      </header>
      <div className="app-body">
        <aside className="app-sidebar" aria-label="Workspace">
          <p className="sidebar-label">Workspace</p>
          {memberships.length > 0 ? (
            <form action={switchWorkspace} className="switch-form">
              <label htmlFor="workspaceId">Active workspace</label>
              <select
                id="workspaceId"
                name="workspaceId"
                defaultValue={active?.id}
              >
                {memberships.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <SubmitButton
                idle="Switch workspace"
                busy="Switching…"
                className="sidebar-button"
              />
            </form>
          ) : (
            <p>No workspace yet.</p>
          )}
          <p className="sidebar-user">
            Signed in as
            <br />
            <strong>{user.email}</strong>
          </p>
        </aside>
        <main id="main-content" className="app-main">
          {children}
        </main>
      </div>
    </div>
  );
}
