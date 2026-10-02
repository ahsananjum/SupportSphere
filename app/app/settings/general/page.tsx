import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { GeneralForm } from './general-form';

export const metadata: Metadata = {
  title: 'General settings',
  robots: { index: false, follow: false },
};
export default async function GeneralSettingsPage() {
  const { active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  if (!['owner', 'admin'].includes(active.role))
    return (
      <section className="workspace-card">
        <h1>General settings</h1>
        <p role="alert">Your role cannot change workspace settings.</p>
        <Link href="/app">Return to overview</Link>
      </section>
    );
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / SETTINGS</p>
        <h1>General settings</h1>
        <p className="page-intro">
          Keep your workspace identity and website origin accurate. Changes are
          saved for this workspace only.
        </p>
      </div>
      <section className="workspace-card">
        <GeneralForm
          defaults={{
            name: active.name,
            slug: active.slug,
            timezone: active.timezone,
            companyName: active.companyName ?? '',
            supportName: active.supportName ?? '',
            supportEmail: active.supportEmail ?? '',
            websiteOrigin: active.websiteOrigin ?? '',
          }}
        />
      </section>
    </div>
  );
}
