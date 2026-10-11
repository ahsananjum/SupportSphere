import 'server-only';

import { createHash, createHmac, randomBytes } from 'node:crypto';
export { webhookEventTypes, type WebhookEventType } from './webhook-contract';

export function createWebhookSecret() {
  return randomBytes(32).toString('base64url');
}

export function hashWebhookSecret(secret: string) {
  return createHash('sha256').update(secret).digest('hex');
}

export function webhookSignature(
  secret: string,
  timestamp: string,
  body: string,
) {
  return createHmac('sha256', secret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
}
