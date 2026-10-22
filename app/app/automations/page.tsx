import { AutomatedActionState } from '../../../components/shared/automated-action-state';
import { Timestamp } from '../../../components/shared/record-state';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import { AutomationForm } from './automation-form';
import { RuleControls } from './rule-controls';
import { describeAutomationRule } from '../../../lib/automation/schema';
import type { AutomationRuleRecord } from '../../../lib/automation/schema';
import { automationRunContext } from '../../../lib/ui/automated-action';

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
          'id,rule_id,trigger_type,trigger_entity_id,status,attempt,max_attempts,error_code,error_message,result,created_at,completed_at,automation_rules(name,version)',
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
          {!rulesError && (
            <span className="role-label">{rules?.length ?? 0} total</span>
          )}
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
                    {describeAutomationRule({
                      name: rule.name,
                      triggerType: rule.trigger_type as Parameters<
                        typeof describeAutomationRule
                      >[0]['triggerType'],
                      conditions: rule.conditions as Parameters<
                        typeof describeAutomationRule
                      >[0]['conditions'],
                      actions: rule.actions as Parameters<
                        typeof describeAutomationRule
                      >[0]['actions'],
                      enabled: rule.enabled,
                    })}
                  </p>
                  <small>Version {rule.version}</small>
                </div>
                {canManage && (
                  <RuleControls
                    ruleId={rule.id}
                    enabled={rule.enabled}
                    name={rule.name}
                    rule={rule as unknown as AutomationRuleRecord}
                  />
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
                  <strong>
                    {automationRunContext({
                      ruleName: Array.isArray(run.automation_rules)
                        ? run.automation_rules[0]?.name
                        : run.automation_rules?.name,
                      triggerType: run.trigger_type,
                      triggerEntityId: run.trigger_entity_id,
                      completedAt: run.completed_at,
                    })}
                  </strong>
                  <AutomatedActionState
                    kind="automation"
                    run={{ ...run, reason_code: run.error_code }}
                  />
                  <p>
                    Attempt {run.attempt}/{run.max_attempts}
                  </p>
                </div>
                <Timestamp value={run.created_at} timezone={active.timezone} />
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
