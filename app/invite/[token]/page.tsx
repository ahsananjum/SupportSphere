import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '../../../lib/supabase/server';
import { inspectInvitation } from '../../../lib/workspaces/invitations';
import { acceptInvitation } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata: Metadata = {
  title: 'Workspace invitation',
  description: 'Review and accept your SupportSphere workspace invitation.',
  robots: { index: false, follow: false },
};

const messages: Record<string, string> = {
  invalid: 'This invitation link is invalid.',
  expired: 'This invitation has expired. Ask a workspace admin to resend it.',
  revoked: 'This invitation was revoked. Ask a workspace admin for a new one.',
  used: 'This invitation has already been used.',
  wrong_account:
    'This invitation belongs to a different email address. Sign in with the invited account.',
  error: 'The invitation could not be accepted. Please try again.',
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const invitation = await inspectInvitation(token);
  const result =
    query.result && messages[query.result] ? query.result : invitation.status;
  if (invitation.status !== 'active')
    return (
      <main id="main-content" className="invite-shell workspace-card">
        <Link href="/" className="invite-brand">
          SupportSphere <span aria-hidden="true">✳</span>
        </Link>
        <p className="eyebrow">INVITATION STATUS</p>
        <h1>Invitation unavailable</h1>
        <p role="alert">{messages[result] ?? messages.invalid}</p>
        <Link href="/app" className="secondary-button inline-button">
          Go to your workspace
        </Link>
      </main>
    );
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const signedInEmail = data.user?.email?.toLowerCase();
  return (
    <main id="main-content" className="invite-shell workspace-card">
      <Link href="/" className="invite-brand">
        SupportSphere <span aria-hidden="true">✳</span>
      </Link>
      <p className="eyebrow">INVITATION</p>
      <h1>Join {invitation.workspaceName}</h1>
      <p className="page-intro">
        You have been invited as a {invitation.role} at {invitation.email}.
      </p>
      {result === 'error' && (
        <p role="alert" className="form-error">
          {messages.error}
        </p>
      )}
      {result === 'wrong_account' ||
      (signedInEmail && signedInEmail !== invitation.email) ? (
        <p role="alert" className="form-error">
          You are signed in as {signedInEmail}. Sign out and use{' '}
          {invitation.email} to accept this invitation.
        </p>
      ) : data.user ? (
        <form action={acceptInvitation}>
          <input type="hidden" name="token" value={token} />
          <SubmitButton idle="Accept invitation" busy="Joining…" />
        </form>
      ) : (
        <div className="invite-actions">
          <Link
            className="primary-button inline-button"
            href={'/login?next=' + encodeURIComponent('/invite/' + token)}
          >
            Sign in to accept
          </Link>
          <Link href={'/signup?next=' + encodeURIComponent('/invite/' + token)}>
            Create an account
          </Link>
        </div>
      )}
    </main>
  );
}
