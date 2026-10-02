import type { Metadata } from 'next';
import { connection } from 'next/server';
import { getWorkspaceContext } from '../../lib/workspaces/context';
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
    <AppNavigation
      active={active}
      memberships={memberships}
      email={user.email ?? ''}
    >
      {children}
    </AppNavigation>
  );
}
