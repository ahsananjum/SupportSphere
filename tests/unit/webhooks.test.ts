import { describe, expect, it } from 'vitest';
import {
  webhookEventTypes,
  webhookSignature,
} from '../../lib/integrations/webhooks';

describe('outgoing webhooks', () => {
  it('signs the timestamp and exact body deterministically', () => {
    expect(webhookSignature('secret', '1700000000', '{"ok":true}')).toBe(
      'c1afc7c2df3db0690d7d75954610ed1a1d959ce96355ccb8c0a8bc09fd0cfc27',
    );
  });

  it('keeps the event allowlist explicit', () => {
    expect(webhookEventTypes).toEqual([
      'conversation.created',
      'message.created',
      'ticket.created',
      'conversation.escalated',
      'webhook.test',
    ]);
  });
});
