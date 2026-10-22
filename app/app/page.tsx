import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../lib/workspaces/context';
import { CreateWorkspaceForm } from './create-workspace-form';
import { supportOverview } from '../../lib/support/overview';
import { PageHeading } from '../../components/shared/page-heading';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'Manage your private SupportSphere workspace.',
  robots: { index: false, follow: false },
};

export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string; error?: string }>;
}) {
  const { active, supabase } = await getWorkspaceContext();
  const params = await searchParams;
  if (!active)
    return (
      <section className="workspace-card onboarding-card">
        <p className="eyebrow">YOUR SUPPORT DESK BEGINS HERE</p>
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
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  const queues = await supportOverview(supabase, active.id);
  return (
    <section className="support-page">
      <PageHeading
        title={active.name}
        eyebrow="WORKSPACE / OVERVIEW"
        description="Pick up support work from your current queues."
      />
      <ul className="support-list" aria-label="Current work queues">
        {queues.map((queue) => (
          <li key={queue.href} className="support-row">
            <Link href={queue.href}>
              <span className="support-row-top">
                <strong>{queue.label}</strong>
                <span>{queue.unavailable ? 'Unavailable' : queue.count}</span>
              </span>
              {queue.unavailable && (
                <span className="form-error">
                  This count could not be loaded. Open the queue to retry.
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <section className="workspace-card">
        <h2>Support readiness</h2>
        <p>
          AI mode:{' '}
          {active.aiMode === 'off'
            ? 'Off'
            : active.aiMode === 'draft_only'
              ? 'Draft only'
              : active.aiMode === 'assisted'
                ? 'Assisted'
                : 'Unavailable'}
          . Knowledge readiness and policy gates still govern each run.
        </p>
        <div className="filter-bar">
          <Link className="quiet-link" href="/app/knowledge">
            Review knowledge readiness ↗
          </Link>
          <Link className="quiet-link" href="/app/ai/runs">
            Review AI work ↗
          </Link>
          <Link className="quiet-link" href="/app/customers">
            Customer directory ↗
          </Link>
        </div>
      </section>
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
        {['owner', 'admin'].includes(active.role) ? 'Manage team' : 'View team'}{' '}
        <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
