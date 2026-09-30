import Link from 'next/link';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import { CreateWorkspaceForm } from './create-workspace-form';

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const { active } = await getWorkspaceContext();
  const params = await searchParams;
  if (!active)
    return (
      <section className="workspace-card">
        <p className="eyebrow">GET STARTED</p>
        <h1>Create your workspace</h1>
        <p className="page-intro">
          Your workspace keeps your team and support data separate from every
          other organization.
        </p>
        {params.invite && (
          <p role="status" className="form-notice">
            You have no active workspace. Create one or ask an admin to send an
            invitation.
          </p>
        )}
        <CreateWorkspaceForm />
      </section>
    );
  return (
    <section className="workspace-card">
      <p className="eyebrow">WORKSPACE</p>
      <h1>{active.name}</h1>
      <p className="page-intro">
        You are signed in as a {active.role}. Manage your team or switch
        workspaces from the menu.
      </p>
      {params.invite === 'accepted' && (
        <p role="status" className="form-success">
          Invitation accepted. Welcome to {active.name}.
        </p>
      )}
      {params.invite === 'already_member' && (
        <p role="status" className="form-notice">
          You already belong to this workspace.
        </p>
      )}
      {params.error && (
        <p role="alert" className="form-error">
          That workspace is unavailable to your account.
        </p>
      )}
      <Link className="primary-button inline-button" href="/app/team">
        View team
      </Link>
    </section>
  );
}
