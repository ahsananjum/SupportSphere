import 'server-only';

import { randomUUID } from 'node:crypto';
import { redisKeys } from './keys';
import { getRedisClient, type RedisClient } from './client';

export async function claimIdempotency(
  scope: string,
  key: string,
  ttlSeconds = 86_400,
  redis: RedisClient = getRedisClient(),
) {
  return (
    (await redis.set(redisKeys.idempotency(scope, key), randomUUID(), {
      nx: true,
      ex: ttlSeconds,
    })) === 'OK'
  );
}

export async function acquireLock(
  scope: string,
  key: string,
  ttlSeconds = 60,
  redis: RedisClient = getRedisClient(),
) {
  const token = randomUUID();
  const acquired =
    (await redis.set(redisKeys.lock(scope, key), token, {
      nx: true,
      ex: ttlSeconds,
    })) === 'OK';
  return acquired ? token : null;
}

export async function releaseLock(
  scope: string,
  key: string,
  token: string,
  redis: RedisClient = getRedisClient(),
) {
  const current = await redis.get(redisKeys.lock(scope, key));
  if (current !== token) return false;
  return (await redis.del(redisKeys.lock(scope, key))) > 0;
}
