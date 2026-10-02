import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { InviteForm } from './invite-form';
import {
  changeMemberRole,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from '../actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata: Metadata = {
  title: 'Team',
  description: 'Manage workspace members and invitations in SupportSphere.',
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  resent: 'Invitation sent again.',
  revoked: 'Invitation revoked.',
  role: 'Member role updated.',
  removed: 'Member removed.',
};
const errors: Record<string, string> = {
  invalid: 'Check the submitted details and try again.',
  forbidden: 'You do not have permission for that action.',
  invite: 'This invitation could not be changed.',
  email:
    'The invitation email was not delivered. Check email settings and retry.',
  'delivery-status':
    'The email may have been sent, but its status could not be saved. Check the inbox before retrying.',
  role: 'The member role could not be changed. Check owner and role permissions.',
  member: 'The member could not be removed.',
  'last-owner': 'Assign another owner before removing the last owner.',
};

function invitationStatus(invite: {
  revoked_at: string | null;
  accepted_at: string | null;
  expires_at: string;
  delivery_status: string;
}) {
  if (invite.revoked_at) return 'Revoked';
  if (invite.accepted_at) return 'Accepted';
  if (new Date(invite.expires_at).getTime() <= Date.now()) return 'Expired';
  return invite.delivery_status === 'failed' ? 'Email failed' : 'Pending';
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const { supabase, active, user } = await getWorkspaceContext();
  const params = await searchParams;
  if (!active)
    return (
      <section className="workspace-card">
        <h1>Team</h1>
        <p>Create a workspace first.</p>
        <Link href="/app">Create workspace</Link>
      </section>
    );
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');

  const [membersResult, invitesResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('user_id,role,joined_at,profiles(display_name,email_normalized)')
      .eq('workspace_id', active.id)
      .order('joined_at'),
    ['owner', 'admin'].includes(active.role)
      ? supabase
          .from('workspace_invitations')
          .select(
            'id,email_normalized,role,expires_at,accepted_at,revoked_at,delivery_status,last_sent_at',
          )
          .eq('workspace_id', active.id)
          .order('created_at', { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersResult.error || invitesResult.error)
    return (
      <section className="workspace-card">
        <h1>Team</h1>
        <p role="alert">We could not load the team. Refresh to try again.</p>
      </section>
    );
  const canManage = active.role === 'owner' || active.role === 'admin';
  const ownerCount =
    membersResult.data?.filter((member) => member.role === 'owner').length ?? 0;

  return (
    <div className="team-page">
      <div className="page-heading">
        <p className="eyebrow">{active.name.toUpperCase()}</p>
        <h1>Team</h1>
        <p className="page-intro">
          Invite colleagues and manage access to this workspace.
        </p>
        <p className="team-summary">
          {membersResult.data?.length ?? 0}{' '}
          {membersResult.data?.length === 1 ? 'member' : 'members'} in this
          workspace
        </p>
      </div>
      {params.notice && notices[params.notice] && (
        <p role="status" className="form-success">
          {notices[params.notice]}
        </p>
      )}
      {params.error && errors[params.error] && (
        <p role="alert" className="form-error">
          {errors[params.error]}
        </p>
      )}
      {canManage && (
        <section className="workspace-card" aria-labelledby="invite-heading">
          <h2 id="invite-heading">Invite a teammate</h2>
          <InviteForm isOwner={active.role === 'owner'} />
        </section>
      )}
      <section className="workspace-card" aria-labelledby="members-heading">
        <h2 id="members-heading">Members</h2>
        {membersResult.data?.length ? (
          <ul className="record-list">
            {membersResult.data.map((member) => {
              const profile = Array.isArray(member.profiles)
                ? member.profiles[0]
                : member.profiles;
              const canEdit =
                canManage &&
                (member.role !== 'owner' || ownerCount > 1) &&
                (active.role === 'owner' ||
                  !['owner', 'admin'].includes(member.role));
              return (
                <li key={member.user_id} className="record">
                  <div>
                    <strong>
                      {profile?.display_name ||
                        profile?.email_normalized ||
                        'Member'}
                    </strong>
                    <p>{profile?.email_normalized}</p>
                    <span className="role-label">
                      {member.role}
                      {member.user_id === user.id ? ' · you' : ''}
                    </span>
                    {member.role === 'owner' && ownerCount === 1 && (
                      <p className="field-help">
                        The last owner cannot change role or be removed.
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="record-actions">
                      <form action={changeMemberRole} className="inline-form">
                        <input
                          type="hidden"
                          name="userId"
                          value={member.user_id}
                        />
                        <label htmlFor={'role-' + member.user_id}>Role</label>
                        <select
                          id={'role-' + member.user_id}
                          name="role"
                          defaultValue={member.role}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="agent">Agent</option>
                          {active.role === 'owner' && (
                            <option value="admin">Admin</option>
                          )}
                          {active.role === 'owner' && (
                            <option value="owner">Owner</option>
                          )}
                        </select>
                        <SubmitButton
                          idle="Save role"
                          busy="Saving…"
                          className="secondary-button"
                        />
                      </form>
                      <form action={removeMember} className="confirm-form">
                        <input
                          type="hidden"
                          name="userId"
                          value={member.user_id}
                        />
                        <label>
                          <input type="checkbox" name="confirm" required />{' '}
                          Confirm removal
                        </label>
                        <SubmitButton
                          idle="Remove"
                          busy="Removing…"
                          className="danger-button"
                        />
                      </form>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No members yet.</p>
        )}
      </section>
      {canManage && (
        <section className="workspace-card" aria-labelledby="pending-heading">
          <h2 id="pending-heading">Invitations</h2>
          {invitesResult.data?.length ? (
            <ul className="record-list">
              {invitesResult.data.map((invite) => {
                const status = invitationStatus(invite);
                const open = !invite.revoked_at && !invite.accepted_at;
                return (
                  <li key={invite.id} className="record">
                    <div>
                      <strong>{invite.email_normalized}</strong>
                      <p>
                        {invite.role} · {status}
                      </p>
                      <span className="field-help">
                        Expires{' '}
                        {new Date(invite.expires_at).toLocaleDateString(
                          'en-US',
                        )}
                      </span>
                    </div>
                    {open && (
                      <div className="record-actions">
                        <form action={resendInvitation}>
                          <input
                            type="hidden"
                            name="invitationId"
                            value={invite.id}
                          />
                          <SubmitButton
                            idle="Resend"
                            busy="Sending…"
                            className="secondary-button"
                          />
                        </form>
                        <form
                          action={revokeInvitation}
                          className="confirm-form"
                        >
                          <input
                            type="hidden"
                            name="invitationId"
                            value={invite.id}
                          />
                          <label>
                            <input type="checkbox" name="confirm" required />{' '}
                            Confirm revoke
                          </label>
                          <SubmitButton
                            idle="Revoke"
                            busy="Revoking…"
                            className="danger-button"
                          />
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No invitations have been sent.</p>
          )}
        </section>
      )}
    </div>
  );
}
