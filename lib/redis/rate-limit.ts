import 'server-only';

import { redisKeys } from './keys';
import { getRedisClient, type RedisClient } from './client';

export const RATE_LIMITS = {
  auth: { limit: 10, windowSeconds: 60, failOpen: false },
  forgotPassword: { limit: 5, windowSeconds: 3600, failOpen: false },
  signupInvite: { limit: 10, windowSeconds: 3600, failOpen: false },
  contact: { limit: 5, windowSeconds: 3600, failOpen: false },
  widgetOpen: { limit: 20, windowSeconds: 60, failOpen: true },
  widgetMessage: { limit: 12, windowSeconds: 60, failOpen: true },
  fileUpload: { limit: 30, windowSeconds: 3600, failOpen: false },
  aiGeneration: { limit: 30, windowSeconds: 3600, failOpen: false },
  webhookTest: { limit: 10, windowSeconds: 3600, failOpen: false },
  developerApi: { limit: 100, windowSeconds: 60, failOpen: false },
} as const;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  available: boolean;
};

export async function consumeRateLimit(
  bucket: RateLimitBucket,
  identifier: string,
  redis?: RedisClient,
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[bucket];
  const key = redisKeys.rateLimit(bucket, identifier);
  try {
    const client = redis ?? getRedisClient();
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, config.windowSeconds);
    const allowed = count <= config.limit;
    return {
      allowed,
      remaining: Math.max(0, config.limit - count),
      retryAfterSeconds: allowed ? 0 : config.windowSeconds,
      available: true,
    };
  } catch {
    return {
      allowed: config.failOpen,
      remaining: config.failOpen ? config.limit : 0,
      retryAfterSeconds: config.failOpen ? 0 : config.windowSeconds,
      available: false,
    };
  }
}

export async function consumeRateLimitSafe(
  bucket: RateLimitBucket,
  identifier: string,
) {
  return consumeRateLimit(bucket, identifier);
}
