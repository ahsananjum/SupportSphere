import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { AutomationForm } from './automation-form';
import { deleteAutomationRule, toggleAutomationRule } from './actions';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata: Metadata = {
  title: 'Automations',
  description: 'Deterministic, schema-validated workspace workflows.',
  robots: { index: false, follow: false },
};

export default async function AutomationsPage() {
  const { supabase, active } = await getWorkspaceContext();
  if (!active) redirect('/app');
  if (!active.onboardingCompletedAt) redirect('/app/onboarding');
  const [{ data: rules, error: rulesError }, { data: runs, error: runsError }] =
    await Promise.all([
      supabase
        .from('automation_rules')
        .select(
          'id,name,trigger_type,conditions,actions,enabled,version,updated_at',
        )
        .eq('workspace_id', active.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('automation_runs')
        .select(
          'id,rule_id,trigger_type,status,attempt,max_attempts,error_code,error_message,created_at,completed_at',
        )
        .eq('workspace_id', active.id)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
  const canManage = ['owner', 'admin'].includes(active.role);
  return (
    <div className="automations-page">
      <div className="page-heading">
        <p className="eyebrow">WORKSPACE / WORKFLOWS</p>
        <h1>Automations</h1>
        <p className="page-intro">
          Rules run from persisted support events. Every action is validated and
          recorded before it can execute.
        </p>
      </div>
      {canManage && <AutomationForm />}
      <section className="workspace-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RULES</p>
            <h2>Configured automations</h2>
          </div>
          <span className="role-label">{rules?.length ?? 0} total</span>
        </div>
        {rulesError ? (
          <p role="alert">Rules could not be loaded. Refresh to try again.</p>
        ) : rules?.length ? (
          <ul className="record-list">
            {rules.map((rule) => (
              <li className="record automation-rule-row" key={rule.id}>
                <div>
                  <strong>{rule.name}</strong>
                  <p>
                    When <code>{rule.trigger_type.replaceAll('_', ' ')}</code> ·{' '}
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                  <small>Version {rule.version}</small>
                </div>
                {canManage && (
                  <div className="record-actions">
                    <form action={toggleAutomationRule}>
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <SubmitButton
                        idle={rule.enabled ? 'Disable' : 'Enable'}
                        busy="Saving…"
                        className="secondary-button"
                      />
                    </form>
                    <form action={deleteAutomationRule}>
                      <input type="hidden" name="ruleId" value={rule.id} />
                      <SubmitButton
                        idle="Delete"
                        busy="Deleting…"
                        className="text-button"
                      />
                    </form>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>No automations yet</h2>
            <p>
              Create a rule to route real conversations, tickets, or
              escalations.
            </p>
          </div>
        )}
      </section>
      <section className="workspace-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">RUN HISTORY</p>
            <h2>Recent runs</h2>
          </div>
          <span className="role-label">Last 30</span>
        </div>
        {runsError ? (
          <p role="alert">
            Run history could not be loaded. Refresh to try again.
          </p>
        ) : runs?.length ? (
          <ul className="record-list">
            {runs.map((run) => (
              <li className="record automation-run-row" key={run.id}>
                <div>
                  <strong>{run.trigger_type.replaceAll('_', ' ')}</strong>
                  <p>
                    {run.status} · attempt {run.attempt}/{run.max_attempts}
                  </p>
                  {run.error_message && <small>{run.error_message}</small>}
                </div>
                <time dateTime={run.created_at}>
                  {new Date(run.created_at).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <h2>No runs yet</h2>
            <p>Runs appear here after a matching support event is persisted.</p>
          </div>
        )}
      </section>
    </div>
  );
}
