import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyWebhookSignature(input: {
  secret: string;
  signature: string;
  body: string;
  nowSeconds?: number;
  toleranceSeconds?: number;
}) {
  const values = new Map(
    input.signature.split(',').map((part) => {
      const [key, value] = part.split('=', 2);
      return [key, value] as const;
    }),
  );
  const timestamp = Number(values.get('t'));
  const received = values.get('v1') ?? '';
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const tolerance = input.toleranceSeconds ?? 300;
  if (
    !Number.isInteger(timestamp) ||
    Math.abs(now - timestamp) > tolerance ||
    !/^[0-9a-f]{64}$/i.test(received)
  )
    return false;
  const expected = createHmac('sha256', input.secret)
    .update(`${timestamp}.${input.body}`)
    .digest();
  const actual = Buffer.from(received, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
