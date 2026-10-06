import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { siteOrigin } from '../../../../lib/seo';
import { WidgetForm } from './widget-form';

export const metadata: Metadata = {
  title: 'Website widget',
  robots: { index: false, follow: false },
};
export default async function WidgetSettingsPage() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  if (!['owner', 'admin'].includes(active.role))
    return (
      <section className="workspace-card">
        <h1>Website widget</h1>
        <p role="alert">Your role cannot change widget settings.</p>
        <Link href="/app">Return to overview</Link>
      </section>
    );
  const { data: config, error } = await supabase
    .from('widget_configs')
    .select('widget_key,allowed_origins,enabled')
    .eq('workspace_id', active.id)
    .maybeSingle();
  if (error)
    return (
      <section className="workspace-card error-state">
        <h1>Widget settings unavailable</h1>
        <p>Refresh to try again.</p>
        <Link href="/app/settings/widget">Retry</Link>
      </section>
    );
  const configured = siteOrigin();
  const requestHeaders = await headers();
  const host = requestHeaders.get('host');
  const origin =
    configured && new URL(configured).hostname === 'localhost' && host
      ? `http://${host}`
      : configured;
  const snippet =
    config && origin
      ? `<script async src="${origin}/widget/loader.js" data-widget-key="${config.widget_key}"></script>`
      : null;
  return (
    <div className="settings-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / CHANNELS</p>
        <h1>Website widget</h1>
        <p className="page-intro">
          Connect your website to this workspace inbox. The public key
          identifies the widget; customer sessions stay private.
        </p>
      </div>
      <div className="widget-settings-layout">
        <section className="workspace-card">
          <h2>Website access</h2>
          <WidgetForm
            origins={
              config?.allowed_origins.join('\n') ?? active.websiteOrigin ?? ''
            }
            enabled={config?.enabled ?? true}
          />
        </section>
        <section className="workspace-card">
          <h2>Embed on your website</h2>
          {snippet ? (
            <>
              <p>
                Paste this once before your site’s closing body tag. It loads
                asynchronously.
              </p>
              <pre className="widget-code">
                <code>{snippet}</code>
              </pre>
              <p className="field-help">
                Public key: <code>{config!.widget_key}</code>
              </p>
            </>
          ) : (
            <p>
              Save at least one allowed origin to generate this workspace’s
              public embed key.
            </p>
          )}
          <p className="field-help">
            Use the local external test host to verify messages before adding
            the snippet to your site.
          </p>
        </section>
      </div>
    </div>
  );
}
