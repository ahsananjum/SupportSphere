import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../../lib/workspaces/context';
import { EndpointForm } from './endpoint-form';
import { deleteWebhookEndpoint, sendWebhookTest } from './actions';
import { SubmitButton } from '../../../../components/shared/submit-button';
import { ConfirmForm } from './confirm-form';
import { EndpointEditForm } from './endpoint-edit-form';
import { SecretRotateForm } from './secret-rotate-form';

export const metadata: Metadata = {
  title: 'Integrations',
  robots: { index: false, follow: false },
};

export default async function IntegrationsSettingsPage() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  const canManage = active.role === 'owner' || active.role === 'admin';
  const [
    { data: connection, error: connectionError },
    { data: endpoints, error: endpointError },
    { data: deliveries, error: deliveryError },
  ] = await Promise.all([
    supabase
      .from('integration_connections')
      .select('provider,status,display_name,last_error,connected_at,updated_at')
      .eq('workspace_id', active.id)
      .eq('provider', 'webhooks')
      .maybeSingle(),
    supabase
      .from('webhook_endpoints')
      .select(
        'id,name,destination_url,event_types,enabled,status,last_error,last_success_at,created_at,updated_at',
      )
      .eq('workspace_id', active.id)
      .is('revoked_at', null)
      .order('updated_at', { ascending: false }),
    supabase
      .from('webhook_deliveries')
      .select(
        'id,endpoint_id,event_id,event_type,status,response_code,attempts,max_attempts,last_error,delivered_at,created_at',
      )
      .eq('workspace_id', active.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  return (
    <div className="settings-page integrations-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / DEVELOPER</p>
        <h1>Integrations</h1>
        <p className="page-intro">
          Connect an HTTPS endpoint to receive signed, workspace-scoped support
          events. Secrets stay server-only after creation.
        </p>
      </div>
      {connectionError || endpointError || deliveryError ? (
        <section className="workspace-card error-state">
          <h2>Integration state unavailable</h2>
          <p>We could not load the current provider state.</p>
          <Link href="/app/settings/integrations" className="secondary-button">
            Retry
          </Link>
        </section>
      ) : (
        <>
          <section className="workspace-card integration-status-card">
            <div>
              <p className="eyebrow">OUTGOING WEBHOOKS</p>
              <h2>{connection?.display_name ?? 'Outgoing webhooks'}</h2>
              <p>
                {connection?.status === 'connected'
                  ? 'Connected from a configured endpoint.'
                  : connection?.status === 'pending'
                    ? 'Waiting for the first successful signed delivery.'
                    : connection?.status === 'error'
                      ? 'An endpoint needs attention after repeated delivery failures.'
                      : 'Disconnected until an enabled endpoint is configured.'}
              </p>
            </div>
            <span
              className={
                'integration-status ' + (connection?.status ?? 'disconnected')
              }
            >
              {connection?.status ?? 'disconnected'}
            </span>
          </section>
          {canManage && (
            <section className="workspace-card">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">NEW ENDPOINT</p>
                  <h2>Receive support events</h2>
                </div>
              </div>
              <EndpointForm />
            </section>
          )}
          <section className="workspace-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ENDPOINTS</p>
                <h2>Configured destinations</h2>
              </div>
              <span className="role-label">{endpoints?.length ?? 0} total</span>
            </div>
            {endpoints?.length ? (
              <ul className="record-list">
                {endpoints.map((endpoint) => (
                  <li
                    className="record integration-endpoint-row"
                    key={endpoint.id}
                  >
                    <div>
                      <strong>{endpoint.name}</strong>
                      <p>
                        <code>{endpoint.destination_url}</code>
                      </p>
                      <small>
                        {endpoint.status} ·{' '}
                        {endpoint.enabled ? 'Enabled' : 'Disabled'} ·{' '}
                        {endpoint.event_types.join(', ')}
                      </small>
                      {endpoint.last_error && (
                        <small role="alert">{endpoint.last_error}</small>
                      )}
                    </div>
                    {canManage && (
                      <div className="record-actions">
                        <ConfirmForm
                          action={sendWebhookTest}
                          message="Queue a signed test delivery to this endpoint?"
                        >
                          <input
                            type="hidden"
                            name="endpointId"
                            value={endpoint.id}
                          />
                          <SubmitButton
                            idle="Send test"
                            busy="Queueing…"
                            className="secondary-button"
                          />
                        </ConfirmForm>
                        <ConfirmForm
                          action={deleteWebhookEndpoint}
                          message="Revoke this endpoint and cancel queued deliveries?"
                        >
                          <input
                            type="hidden"
                            name="endpointId"
                            value={endpoint.id}
                          />
                          <SubmitButton
                            idle="Revoke"
                            busy="Revoking…"
                            className="text-button"
                          />
                        </ConfirmForm>
                      </div>
                    )}
                    {canManage && (
                      <details className="integration-edit-details">
                        <summary>Edit endpoint</summary>
                        <EndpointEditForm endpoint={endpoint} />
                        <SecretRotateForm endpointId={endpoint.id} />
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <h2>No endpoints yet</h2>
                <p>
                  Connect a destination to receive signed events from this
                  workspace.
                </p>
              </div>
            )}
          </section>
          <section className="workspace-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">DELIVERY HISTORY</p>
                <h2>Recent attempts</h2>
              </div>
              <span className="role-label">Last 30</span>
            </div>
            {deliveries?.length ? (
              <ul className="record-list">
                {deliveries.map((delivery) => (
                  <li
                    className="record integration-delivery-row"
                    key={delivery.id}
                  >
                    <div>
                      <strong>{delivery.event_type}</strong>
                      <p>
                        {delivery.status} · attempt {delivery.attempts}/
                        {delivery.max_attempts}
                        {delivery.response_code
                          ? ` · HTTP ${delivery.response_code}`
                          : ''}
                      </p>
                      {delivery.last_error && (
                        <small>{delivery.last_error}</small>
                      )}
                    </div>
                    <time dateTime={delivery.created_at}>
                      {new Date(delivery.created_at).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <h2>No deliveries yet</h2>
                <p>Send a test or wait for a subscribed support event.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
