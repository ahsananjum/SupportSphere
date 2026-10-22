import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { auditActorLabel } from '../../../../lib/ui/automated-action';

export const metadata: Metadata = {
  title: 'Security settings',
  robots: { index: false, follow: false },
};

const auditLabels: Record<string, string> = {
  'workspace.created': 'Workspace created',
  'workspace.settings_updated': 'Workspace settings saved',
  'onboarding.advanced': 'Setup step completed',
  'onboarding.completed': 'Workspace setup completed',
  'member.joined': 'Member joined',
  'member.role_changed': 'Member role changed',
  'member.removed': 'Member removed',
  'invitation.created': 'Invitation created',
  'invitation.resent': 'Invitation resent',
  'invitation.revoked': 'Invitation revoked',
  'automation.rule_created': 'Automation rule created',
  'automation.rule_updated': 'Automation rule updated',
  'webhook.delivery_retried': 'Webhook delivery retried',
  'webhook.endpoint_created': 'Webhook endpoint created',
};
export default async function SecuritySettingsPage() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  if (active.role !== 'owner')
    return (
      <section className="workspace-card">
        <h1>Security settings</h1>
        <p role="alert">Only workspace owners can view security settings.</p>
        <Link href="/app">Return to overview</Link>
      </section>
    );
  const [members, audit] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id,role')
      .eq('workspace_id', active.id),
    supabase
      .from('audit_logs')
      .select(
        'id,action,created_at,actor_user_id,target_type,target_id,metadata',
      )
      .eq('workspace_id', active.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);
  const actorIds = [
    ...new Set(
      (audit.data ?? [])
        .map((event) => event.actor_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: actors } = actorIds.length
    ? await supabase
        .from('profiles')
        .select('id,display_name,email_normalized')
        .in('id', actorIds)
    : { data: [] };
  const actorById = new Map((actors ?? []).map((actor) => [actor.id, actor]));
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / SETTINGS</p>
        <h1>Security</h1>
        <p className="page-intro">
          Review who can access this workspace and its recent protected changes.
        </p>
      </div>
      {members.error || audit.error ? (
        <section className="workspace-card">
          <p role="alert">
            Security information could not be loaded. Refresh to try again.
          </p>
        </section>
      ) : (
        <>
          <section className="workspace-card">
            <h2>Access baseline</h2>
            <p>
              Members with an active workspace role can view workspace data.
              Owners and admins manage team access; only owners can change owner
              roles. The last owner is protected from removal.
            </p>
            <p className="team-summary">
              {members.data?.length ?? 0}{' '}
              {members.data?.length === 1 ? 'active member' : 'active members'}
            </p>
            <Link href="/app/team" className="secondary-button inline-button">
              Review members
            </Link>
          </section>
          <section className="workspace-card">
            <h2>Recent audit events</h2>
            {audit.data?.length ? (
              <ul className="record-list">
                {audit.data.map((event) => (
                  <li className="record" key={event.id}>
                    <strong>
                      {auditLabels[event.action] ??
                        event.action
                          .replaceAll('_', ' ')
                          .replaceAll('.', ' · ')}
                    </strong>
                    <p>
                      {auditActorLabel(
                        event.actor_user_id,
                        event.actor_user_id
                          ? actorById.get(event.actor_user_id)
                          : null,
                      )}{' '}
                      · {event.target_type} {event.target_id?.slice(0, 8) ?? ''}
                    </p>
                    <time dateTime={event.created_at}>
                      {new Date(event.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No auditable workspace actions have been recorded yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
