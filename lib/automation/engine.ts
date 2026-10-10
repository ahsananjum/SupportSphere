import 'server-only';

import { createAdminClient } from '../supabase/admin';
import type { Json } from '../supabase/database.types';
import { logEvent } from '../observability/log';
import {
  actionToJson,
  automationConditionsSchema,
  automationRuleSchema,
  type AutomationAction,
  type AutomationEvent,
} from './schema';

export function matchesConditions(
  payload: Record<string, unknown>,
  conditions: unknown,
) {
  const parsed = automationConditionsSchema.safeParse(conditions);
  if (!parsed.success) return false;
  const c = parsed.data;
  return (
    (c.status === undefined || payload.status === c.status) &&
    (c.priority === undefined || payload.priority === c.priority) &&
    (c.channel === undefined || payload.channel === c.channel) &&
    (c.tagId === undefined || payload.tag_id === c.tagId)
  );
}

export async function enqueueAutomationEvent(event: AutomationEvent) {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('enqueue_automation_event', {
    p_workspace_id: event.workspaceId,
    p_trigger_type: event.triggerType,
    p_entity_id: event.entityId,
    p_payload: event.payload as Json,
    p_event_key: `${event.triggerType}:${event.entityId}`,
  });
  if (error) {
    logEvent('automation.enqueue', 'failed', { errorClass: error.code });
    throw new Error('AUTOMATION_ENQUEUE_FAILED');
  }
  return Number(data ?? 0);
}

function entityTypeForTrigger(trigger: string) {
  return trigger === 'ticket_created' ? 'ticket' : 'conversation';
}

export async function executeAutomationRun(run: {
  id: string;
  workspace_id: string;
  rule_id: string;
  trigger_type: string;
  trigger_entity_id: string | null;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { data: rule, error } = await admin
    .from('automation_rules')
    .select('id,enabled,trigger_type,conditions,actions')
    .eq('id', run.rule_id)
    .eq('workspace_id', run.workspace_id)
    .maybeSingle();
  if (error) throw new Error('AUTOMATION_RULE_UNAVAILABLE');
  if (!rule || !rule.enabled || rule.trigger_type !== run.trigger_type)
    return { status: 'skipped' as const, reason: 'disabled_or_changed' };
  const parsed = automationRuleSchema.safeParse({
    name: 'runtime',
    triggerType: rule.trigger_type,
    conditions: rule.conditions,
    actions: rule.actions,
    enabled: rule.enabled,
  });
  if (!parsed.success || !matchesConditions(run.payload, rule.conditions))
    return { status: 'skipped' as const, reason: 'conditions_not_met' };
  const entityType = entityTypeForTrigger(run.trigger_type);
  for (const action of parsed.data.actions)
    await applyAction(
      admin,
      run.workspace_id,
      entityType,
      run.trigger_entity_id,
      action,
    );
  return { status: 'succeeded' as const, actions: parsed.data.actions.length };
}

async function applyAction(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  entityType: string,
  entityId: string | null,
  action: AutomationAction,
) {
  if (!entityId) throw new Error('AUTOMATION_ENTITY_MISSING');
  const { error } = await admin.rpc('apply_automation_action', {
    p_workspace_id: workspaceId,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_action_type: action.type,
    p_params: actionToJson(action) as Json,
  });
  if (error)
    throw new Error(
      error.code === 'P0001'
        ? 'AUTOMATION_ACTION_REJECTED'
        : 'AUTOMATION_ACTION_FAILED',
    );
}
