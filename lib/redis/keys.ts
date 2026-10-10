import 'server-only';

import { createHash } from 'node:crypto';

const environment =
  process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';

function safePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 160);
}

export function hashIdentifier(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 32);
}

export const redisKeys = {
  rateLimit: (bucket: string, identifier: string) =>
    `ss:${environment}:ratelimit:${safePart(bucket)}:${hashIdentifier(identifier)}`,
  cache: (scope: string, key: string) =>
    `ss:${environment}:cache:${safePart(scope)}:${safePart(key)}`,
  idempotency: (scope: string, key: string) =>
    `ss:${environment}:idem:${safePart(scope)}:${hashIdentifier(key)}`,
  lock: (scope: string, key: string) =>
    `ss:${environment}:lock:${safePart(scope)}:${hashIdentifier(key)}`,
  jobDedupe: (jobType: string, entityId: string) =>
    `ss:${environment}:job-dedupe:${safePart(jobType)}:${hashIdentifier(entityId)}`,
} as const;
