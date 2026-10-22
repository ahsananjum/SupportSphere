import { z } from 'zod';

export const triggerTypes = [
  'conversation_created',
  'customer_message_received',
  'ticket_created',
  'priority_changed',
  'tag_added',
  'escalation',
] as const;

const uuid = z.string().uuid();

export const automationActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('assign'), userId: uuid }),
  z.object({ type: z.literal('add_tag'), tagId: uuid }),
  z.object({ type: z.literal('remove_tag'), tagId: uuid }),
  z.object({
    type: z.literal('set_priority'),
    value: z.enum(['low', 'normal', 'high', 'urgent']),
  }),
  z.object({
    type: z.literal('set_status'),
    value: z.enum(['open', 'pending', 'closed', 'in_progress', 'resolved']),
  }),
  z.object({
    type: z.literal('notify'),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(400),
    userId: uuid.optional(),
    dedupeKey: z.string().trim().min(1).max(200).optional(),
    targetRoute: z.string().trim().max(500).optional(),
  }),
  z.object({ type: z.literal('invoke_triage') }),
  z.object({ type: z.literal('invoke_ai_draft') }),
  z.object({
    type: z.literal('create_ticket'),
    title: z.string().trim().min(1).max(240),
    description: z.string().max(40000).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    category: z.string().trim().max(120).optional(),
  }),
]);

export type AutomationAction = z.infer<typeof automationActionSchema>;
export const automationConditionsSchema = z
  .object({
    status: z.string().max(40).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    channel: z.enum(['manual', 'widget', 'email', 'api']).optional(),
    tagId: uuid.optional(),
  })
  .strict();

export const automationRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    triggerType: z.enum(triggerTypes),
    conditions: automationConditionsSchema.default({}),
    actions: z.array(automationActionSchema).min(1).max(10),
    enabled: z.boolean().default(true),
  })
  .superRefine((rule, ctx) => {
    if (rule.triggerType === 'tag_added' && !rule.conditions.tagId) {
      ctx.addIssue({
        code: 'custom',
        path: ['conditions', 'tagId'],
        message: 'Choose the tag that should trigger this rule.',
      });
    }
    if (
      rule.triggerType === 'ticket_created' &&
      rule.actions.some((action) => action.type === 'create_ticket')
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['actions'],
        message: 'A ticket-created rule cannot create another ticket.',
      });
    }
  });
export type AutomationRuleInput = z.infer<typeof automationRuleSchema>;
export type AutomationRuleRecord = AutomationRuleInput & {
  id: string;
  version: number;
  trigger_type: AutomationRuleInput['triggerType'];
  conditions: AutomationRuleInput['conditions'];
  actions: AutomationRuleInput['actions'];
  updated_at?: string;
};
export type AutomationEvent = {
  workspaceId: string;
  triggerType: (typeof triggerTypes)[number];
  entityId: string;
  entityType: 'conversation' | 'ticket' | 'message';
  payload: Record<string, unknown>;
};

export function actionToJson(action: AutomationAction) {
  const value = action as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key.replace(/[A-Z]/g, (letter) => '_' + letter.toLowerCase()),
      item,
    ]),
  );
}

export const triggerLabels: Record<(typeof triggerTypes)[number], string> = {
  conversation_created: 'a conversation is created',
  customer_message_received: 'a customer message is received',
  ticket_created: 'a ticket is created',
  priority_changed: 'a priority changes',
  tag_added: 'a tag is added',
  escalation: 'a conversation is escalated',
};

export function describeAutomationAction(action: AutomationAction) {
  switch (action.type) {
    case 'assign':
      return 'assign the record to a teammate';
    case 'add_tag':
      return 'add a tag';
    case 'remove_tag':
      return 'remove a tag';
    case 'set_priority':
      return `set priority to ${action.value}`;
    case 'set_status':
      return `set status to ${action.value.replaceAll('_', ' ')}`;
    case 'notify':
      return `notify the support team: ${action.title}`;
    case 'invoke_triage':
      return 'queue AI triage for review';
    case 'invoke_ai_draft':
      return 'queue an AI draft for review';
    case 'create_ticket':
      return `create ticket “${action.title}”`;
  }
}

export function describeAutomationRule(
  rule: Pick<
    AutomationRuleInput,
    'name' | 'triggerType' | 'conditions' | 'actions' | 'enabled'
  >,
) {
  const conditions = Object.entries(rule.conditions)
    .filter(([, value]) => value)
    .map(
      ([key, value]) =>
        `${key.replaceAll('_', ' ')} is ${String(value).replaceAll('_', ' ')}`,
    );
  const when = `When ${triggerLabels[rule.triggerType]}${conditions.length ? ` and ${conditions.join(' and ')}` : ''}`;
  const actions = rule.actions.map(describeAutomationAction).join('; ');
  return `${when}, ${actions}. ${rule.enabled ? 'Enabled' : 'Disabled'}`;
}
