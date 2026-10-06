import 'server-only';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { getServerSupabaseEnv } from '../env';

type Bootstrap = { key: string; origin: string; expires: number };

function secret() {
  return createHash('sha256')
    .update('supportsphere-widget-bootstrap-v1:')
    .update(getServerSupabaseEnv().SUPABASE_SERVICE_ROLE_KEY)
    .digest();
}

export function hashToken(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function signBootstrap(key: string, origin: string) {
  const body = Buffer.from(
    JSON.stringify({ key, origin, expires: Date.now() + 5 * 60_000 }),
  ).toString('base64url');
  const signature = createHmac('sha256', secret())
    .update(body)
    .digest('base64url');
  return `${body}.${signature}`;
}

export function verifyBootstrap(token: string): Bootstrap | null {
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra || body.length > 1000) return null;
  const expected = createHmac('sha256', secret()).update(body).digest();
  let actual: Buffer;
  try {
    actual = Buffer.from(signature, 'base64url');
  } catch {
    return null;
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    return null;
  try {
    const value = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as Bootstrap;
    if (
      typeof value.key !== 'string' ||
      !/^wgt_[a-f0-9]{32}$/.test(value.key) ||
      typeof value.origin !== 'string' ||
      typeof value.expires !== 'number' ||
      value.expires < Date.now() ||
      value.expires > Date.now() + 5 * 60_000
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

export function normalizeOrigin(input: string | null) {
  if (!input) return null;
  try {
    const url = new URL(input);
    return url.href === `${url.origin}/` || input === url.origin
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
