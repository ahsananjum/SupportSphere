'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getWorkspaceContext } from '../../../lib/workspaces/context';
import {
  automationRuleSchema,
  type AutomationAction,
  type AutomationRuleInput,
} from '../../../lib/automation/schema';
import type { FormState } from '../../../lib/action-state';
import { logEvent } from '../../../lib/observability/log';

function values(formData: FormData) {
  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, text(value)]),
  );
}

function text(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}
function parseAction(formData: FormData): AutomationAction {
  const type = text(formData.get('actionType'));
  if (type === 'assign') return { type, userId: text(formData.get('userId')) };
  if (type === 'set_priority' || type === 'set_status')
    return {
      type,
      value: text(formData.get('actionValue')),
    } as AutomationAction;
  if (type === 'notify')
    return {
      type,
      title: text(formData.get('notifyTitle')),
      body: text(formData.get('notifyBody')),
      dedupeKey: text(formData.get('dedupeKey')) || undefined,
      targetRoute: text(formData.get('targetRoute')) || undefined,
    };
  if (type === 'create_ticket')
    return {
      type,
      title: text(formData.get('ticketTitle')),
      description: text(formData.get('ticketDescription')) || undefined,
      priority: (text(formData.get('ticketPriority')) || undefined) as
        'low' | 'normal' | 'high' | 'urgent' | undefined,
    };
  if (type === 'add_tag' || type === 'remove_tag')
    return { type, tagId: text(formData.get('tagId')) };
  if (type === 'invoke_triage' || type === 'invoke_ai_draft') return { type };
  throw new Error('INVALID_AUTOMATION_ACTION');
}
function inputFrom(formData: FormData): AutomationRuleInput {
  return {
    name: text(formData.get('name')),
    triggerType: text(formData.get('triggerType')),
    conditions: {
      priority: text(formData.get('conditionPriority')) || undefined,
      status: text(formData.get('conditionStatus')) || undefined,
    },
    actions: [parseAction(formData)],
    enabled: formData.get('enabled') === 'on',
  } as AutomationRuleInput;
}
export async function createAutomationRule(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  let raw: AutomationRuleInput;
  try {
    raw = inputFrom(formData);
  } catch {
    return { message: 'Choose a supported automation action.' };
  }
  const parsed = automationRuleSchema.safeParse(raw);
  if (!parsed.success)
    return {
      message: 'Review the rule name, trigger, conditions, and action fields.',
      fields: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          String(issue.path.at(-1) ?? 'rule'),
          issue.message,
        ]),
      ),
      values: values(formData),
    };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    return {
      message: 'Only workspace owners and admins can manage automations.',
    };
  const { error } = await supabase.rpc('create_automation_rule', {
    p_workspace_id: active.id,
    p_name: parsed.data.name,
    p_trigger_type: parsed.data.triggerType,
    p_conditions: parsed.data.conditions,
    p_actions: parsed.data.actions,
    p_enabled: parsed.data.enabled,
  });
  if (error) {
    logEvent('automation.rule', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return {
      message: error.message.includes('duplicate')
        ? 'Use a different rule name.'
        : 'The automation could not be saved. Check the fields and retry.',
    };
  }
  revalidatePath('/app/automations');
  return { success: 'Automation rule saved.' };
}
export async function toggleAutomationRule(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.string().uuid().safeParse(formData.get('ruleId'));
  if (!id.success)
    return { message: 'This rule is unavailable. Refresh the page.' };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    return {
      message: 'Only workspace owners and admins can manage automations.',
    };
  const { data: rule } = await supabase
    .from('automation_rules')
    .select('id,name,trigger_type,conditions,actions,enabled')
    .eq('workspace_id', active.id)
    .eq('id', id.data)
    .maybeSingle();
  if (!rule)
    return { message: 'This rule could not be loaded. Refresh and retry.' };
  const { error } = await supabase.rpc('update_automation_rule', {
    p_workspace_id: active.id,
    p_rule_id: rule.id,
    p_name: rule.name,
    p_trigger_type: rule.trigger_type,
    p_conditions: rule.conditions,
    p_actions: rule.actions,
    p_enabled: !rule.enabled,
  });
  if (error) {
    logEvent('automation.rule.toggle', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return { message: 'The rule could not be updated. Try again.' };
  }
  revalidatePath('/app/automations');
  return {
    success: rule.enabled ? 'Automation disabled.' : 'Automation enabled.',
  };
}
export async function deleteAutomationRule(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = z.string().uuid().safeParse(formData.get('ruleId'));
  if (!id.success || formData.get('confirm') !== 'on')
    return { message: 'Confirm deletion before removing this automation.' };
  const { supabase, active } = await getWorkspaceContext();
  if (!active || !['owner', 'admin'].includes(active.role))
    return {
      message: 'Only workspace owners and admins can manage automations.',
    };
  const { error } = await supabase.rpc('delete_automation_rule', {
    p_workspace_id: active.id,
    p_rule_id: id.data,
  });
  if (error) {
    logEvent('automation.rule.delete', 'failed', {
      workspaceId: active.id,
      errorClass: error.code,
    });
    return { message: 'The rule could not be deleted. Try again.' };
  }
  revalidatePath('/app/automations');
  return { success: 'Automation deleted.' };
}
