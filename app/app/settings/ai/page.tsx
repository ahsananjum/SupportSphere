import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { AiSettingsForm } from './settings-form';

export const metadata = {
  title: 'AI policy',
  robots: { index: false, follow: false },
};
export default async function AiSettingsPage() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  if (!['owner', 'admin'].includes(active.role))
    return (
      <section className="workspace-card">
        <h1>AI policy</h1>
        <p role="alert">Your role cannot change AI policy.</p>
        <Link href="/app">Return to overview</Link>
      </section>
    );
  const { data: config, error } = await supabase
    .from('ai_agent_configs')
    .select('*')
    .eq('workspace_id', active.id)
    .maybeSingle();
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / AI</p>
        <h1>AI policy</h1>
        <p className="page-intro">
          Choose when the assistant may draft or send grounded answers. Human
          handoff remains active for sensitive requests.
        </p>
      </div>
      {error || !config ? (
        <section className="workspace-card error-state">
          <h2>AI policy unavailable</h2>
          <p>Refresh this page to retry.</p>
          <Link href="/app/settings/ai" className="secondary-button">
            Retry
          </Link>
        </section>
      ) : (
        <section className="workspace-card">
          <AiSettingsForm config={config} />
        </section>
      )}
    </div>
  );
}
