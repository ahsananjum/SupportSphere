import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { parseEmailEnv } from '../../../lib/validation/env';
import { InviteForm } from '../team/invite-form';
import { continueOnboarding } from '../workspace-actions';
import { SubmitButton } from '../../../components/shared/submit-button';
import { IdentityForm, OriginForm, AiModeForm } from './onboarding-forms';

export const metadata: Metadata = {
  title: 'Workspace setup',
  robots: { index: false, follow: false },
};
const steps = ['identity', 'origin', 'team', 'knowledge', 'ai'] as const;
const labels: Record<(typeof steps)[number], string> = {
  identity: 'Identity',
  origin: 'Website & sender',
  team: 'Team',
  knowledge: 'Knowledge',
  ai: 'AI policy',
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (active.onboardingCompletedAt) redirect('/app');
  const params = await searchParams;
  const current = steps.includes(
    active.onboardingStep as (typeof steps)[number],
  )
    ? (active.onboardingStep as (typeof steps)[number])
    : 'identity';
  const index = steps.indexOf(current);
  let senderEmail: string | null = null;
  try {
    senderEmail = parseEmailEnv(process.env).BREVO_SENDER_EMAIL;
  } catch {
    /* Not configured in this environment. */
  }
  const invites =
    current === 'team' && active.role === 'owner'
      ? await supabase
          .from('workspace_invitations')
          .select(
            'id,email_normalized,role,delivery_status,revoked_at,accepted_at',
          )
          .eq('workspace_id', active.id)
          .order('created_at', { ascending: false })
          .limit(20)
      : null;
  return (
    <div className="setup-page">
      <div className="setup-heading">
        <p className="eyebrow">WORKSPACE SETUP · {active.name.toUpperCase()}</p>
        <h1>Make it yours.</h1>
        <p>
          Each completed step is saved to your workspace. You can leave and
          resume at any time.
        </p>
      </div>
      <ol className="setup-progress" aria-label="Setup progress">
        {steps.map((step, i) => (
          <li
            key={step}
            aria-current={current === step ? 'step' : undefined}
            className={
              i < index ? 'is-done' : current === step ? 'is-current' : ''
            }
          >
            <span aria-hidden="true">
              {i < index ? '✓' : String(i + 1).padStart(2, '0')}
            </span>
            {labels[step]}
          </li>
        ))}
      </ol>
      <section
        className="workspace-card setup-panel"
        aria-labelledby="setup-step-heading"
      >
        {active.role !== 'owner' ? (
          <>
            <p className="eyebrow">WAITING FOR OWNER</p>
            <h2 id="setup-step-heading">Your workspace is being prepared</h2>
            <p>
              Only an owner can finish setup. You can switch to another
              workspace from the menu or return when setup is complete.
            </p>
            <Link href="/app" className="secondary-button inline-button">
              Return to workspace
            </Link>
          </>
        ) : (
          <>
            <p className="setup-step-label">
              STEP {String(index + 1).padStart(2, '0')} /{' '}
              {String(steps.length).padStart(2, '0')}
            </p>
            {current === 'identity' && (
              <>
                <h2 id="setup-step-heading">Support identity</h2>
                <p className="page-intro">
                  Tell your team and customers who will be helping them. Your
                  workspace name, slug, and timezone were saved when you created
                  it.
                </p>
                <IdentityForm
                  companyName={active.companyName ?? ''}
                  supportName={active.supportName ?? ''}
                  supportEmail={active.supportEmail ?? ''}
                />
              </>
            )}
            {current === 'origin' && (
              <>
                <h2 id="setup-step-heading">Website & sender</h2>
                <p className="page-intro">
                  Save the site where support will appear. Widget installation
                  will be available in a later phase.
                </p>
                <OriginForm websiteOrigin={active.websiteOrigin ?? ''} />
                <div className="sender-status">
                  <strong>Transactional sender</strong>
                  <span>
                    {senderEmail
                      ? 'Configured in this environment'
                      : 'Not configured in this environment'}
                  </span>
                  <p>
                    {senderEmail ??
                      'An owner must configure and verify a Brevo sender before custom mail delivery.'}
                  </p>
                </div>
              </>
            )}
            {current === 'team' && (
              <>
                <h2 id="setup-step-heading">Bring in your team</h2>
                <p className="page-intro">
                  Invitations use the real workspace delivery flow. You can
                  invite now or continue and manage members later.
                </p>
                <InviteForm isOwner />
                {invites?.error && (
                  <p role="alert" className="form-error">
                    Invitations could not be loaded. Refresh to try again.
                  </p>
                )}
                {invites?.data && invites.data.length > 0 && (
                  <ul className="setup-invites">
                    {invites.data.map((invite) => (
                      <li key={invite.id}>
                        <span>
                          {invite.email_normalized} · {invite.role}
                        </span>
                        <span>
                          {invite.accepted_at
                            ? 'Accepted'
                            : invite.revoked_at
                              ? 'Revoked'
                              : invite.delivery_status === 'failed'
                                ? 'Email failed'
                                : 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <form action={continueOnboarding} className="setup-continue">
                  <input type="hidden" name="expected" value="team" />
                  <SubmitButton
                    idle="Continue to knowledge"
                    busy="Saving…"
                    className="secondary-button"
                  />
                </form>
              </>
            )}
            {current === 'knowledge' && (
              <>
                <h2 id="setup-step-heading">Knowledge source</h2>
                <p className="page-intro">
                  Knowledge ingestion will be added in P06. There is no source
                  to connect yet, so this step is skippable and no sample
                  content will be created.
                </p>
                <form action={continueOnboarding}>
                  <input type="hidden" name="expected" value="knowledge" />
                  <SubmitButton
                    idle="Skip for now"
                    busy="Saving…"
                    className="primary-button"
                  />
                </form>
              </>
            )}
            {current === 'ai' && (
              <>
                <h2 id="setup-step-heading">Set your AI preference</h2>
                <p className="page-intro">
                  Save your intended policy for when the AI workflow becomes
                  available.
                </p>
                <AiModeForm currentMode={active.aiMode} />
              </>
            )}
            {params.error && (
              <p role="alert" className="form-error">
                We could not advance setup. Refresh the page and try again.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
