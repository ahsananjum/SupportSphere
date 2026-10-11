export const webhookEventTypes = [
  'conversation.created',
  'message.created',
  'ticket.created',
  'conversation.escalated',
  'webhook.test',
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];
