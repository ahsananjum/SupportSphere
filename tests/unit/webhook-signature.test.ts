import { describe, expect, it } from 'vitest';
import { webhookSignature } from '../../lib/integrations/webhooks';
import { verifyWebhookSignature } from '../../lib/integrations/signature';

describe('webhook signature verification', () => {
  it('accepts the exact body and rejects replay, tampering, and malformed headers', () => {
    const body = '{"id":"evt_1"}';
    const timestamp = '1700000000';
    const signature = `t=${timestamp},v1=${webhookSignature('secret', timestamp, body)}`;
    expect(
      verifyWebhookSignature({
        secret: 'secret',
        signature,
        body,
        nowSeconds: 1700000100,
      }),
    ).toBe(true);
    expect(
      verifyWebhookSignature({
        secret: 'secret',
        signature,
        body: '{"id":"evt_2"}',
        nowSeconds: 1700000100,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret: 'secret',
        signature,
        body,
        nowSeconds: 1700000401,
      }),
    ).toBe(false);
    expect(
      verifyWebhookSignature({
        secret: 'secret',
        signature: 'v1=bad',
        body,
        nowSeconds: 1700000100,
      }),
    ).toBe(false);
  });
});
