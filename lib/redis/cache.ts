import 'server-only';

import { redisKeys } from './keys';
import { getRedisClient, type RedisClient } from './client';

export async function getCachedJson<T>(
  scope: string,
  key: string,
  redis: RedisClient = getRedisClient(),
): Promise<T | null> {
  const value = await redis.get(redisKeys.cache(scope, key));
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    await redis.del(redisKeys.cache(scope, key)).catch(() => undefined);
    return null;
  }
}

export async function setCachedJson(
  scope: string,
  key: string,
  value: unknown,
  ttlSeconds: number,
  redis: RedisClient = getRedisClient(),
) {
  await redis.set(redisKeys.cache(scope, key), JSON.stringify(value), {
    ex: ttlSeconds,
  });
}

export async function invalidateCache(
  scope: string,
  key: string,
  redis: RedisClient = getRedisClient(),
) {
  return redis.del(redisKeys.cache(scope, key));
}

export async function invalidateCacheSafe(
  scope: string,
  key: string,
  redis?: RedisClient,
) {
  try {
    return await invalidateCache(scope, key, redis);
  } catch {
    return 0;
  }
}
