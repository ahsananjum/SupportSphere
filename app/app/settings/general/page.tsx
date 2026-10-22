import Link from 'next/link';
import {
  PageHeading,
  SectionHeading,
} from '../../../../components/shared/page-heading';
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
      <PageHeading
        title="General settings"
        eyebrow="WORKSPACE / SETTINGS"
        description="Keep your workspace identity and website origin accurate. Changes are saved for this workspace only."
      />
      <section className="workspace-card">
        <SectionHeading title="Workspace identity" />
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
