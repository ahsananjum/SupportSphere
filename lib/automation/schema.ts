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

export const automationRuleSchema = z.object({
  name: z.string().trim().min(1).max(120),
  triggerType: z.enum(triggerTypes),
  conditions: automationConditionsSchema.default({}),
  actions: z.array(automationActionSchema).min(1).max(10),
  enabled: z.boolean().default(true),
});
export type AutomationRuleInput = z.infer<typeof automationRuleSchema>;
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
