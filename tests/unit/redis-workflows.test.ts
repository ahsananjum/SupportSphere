import { describe, expect, it } from 'vitest';
import type { RedisClient } from '../../lib/redis/client';
import { consumeRateLimit } from '../../lib/redis/rate-limit';
import {
  claimIdempotency,
  acquireLock,
  releaseLock,
} from '../../lib/redis/coordination';
import { redisKeys } from '../../lib/redis/keys';
import {
  getCachedJson,
  invalidateCacheSafe,
  setCachedJson,
} from '../../lib/redis/cache';

function fakeRedis(): RedisClient & {
  values: Map<string, string>;
  counts: Map<string, number>;
} {
  const values = new Map<string, string>();
  const counts = new Map<string, number>();
  return {
    values,
    counts,
    async get(key) {
      return values.get(key) ?? null;
    },
    async set(key, value, options = {}) {
      if (options.nx && values.has(key)) return null;
      values.set(key, value);
      return 'OK';
    },
    async del(key) {
      return values.delete(key) ? 1 : 0;
    },
    async incr(key) {
      const next = (counts.get(key) ?? 0) + 1;
      counts.set(key, next);
      return next;
    },
    async expire() {
      return 1;
    },
  };
}

describe('Redis workflow primitives', () => {
  it('namespaces and hashes tenant-sensitive identifiers', () => {
    const key = redisKeys.rateLimit('widgetMessage', 'raw-ip@example');
    expect(key).toMatch(/^ss:/);
    expect(key).not.toContain('raw-ip@example');
  });

  it('returns 429 state after the central bucket is exhausted', async () => {
    const redis = fakeRedis();
    const first = await consumeRateLimit('widgetMessage', 'session', redis);
    for (let i = 1; i < 12; i++)
      await consumeRateLimit('widgetMessage', 'session', redis);
    const blocked = await consumeRateLimit('widgetMessage', 'session', redis);
    expect(first.allowed).toBe(true);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('deduplicates idempotency and lock ownership', async () => {
    const redis = fakeRedis();
    expect(await claimIdempotency('event', 'same', 60, redis)).toBe(true);
    expect(await claimIdempotency('event', 'same', 60, redis)).toBe(false);
    const token = await acquireLock('automation', 'run', 60, redis);
    expect(token).toBeTruthy();
    expect(await acquireLock('automation', 'run', 60, redis)).toBeNull();
    expect(await releaseLock('automation', 'run', 'wrong', redis)).toBe(false);
    expect(await releaseLock('automation', 'run', token!, redis)).toBe(true);
  });

  it('fails closed for protected buckets and open for widget traffic when Redis is down', async () => {
    const unavailable: RedisClient = {
      get: async () => {
        throw new Error('down');
      },
      set: async () => {
        throw new Error('down');
      },
      del: async () => {
        throw new Error('down');
      },
      incr: async () => {
        throw new Error('down');
      },
      expire: async () => {
        throw new Error('down');
      },
    };
    expect((await consumeRateLimit('auth', 'actor', unavailable)).allowed).toBe(
      false,
    );
    expect(
      (await consumeRateLimit('widgetMessage', 'session', unavailable)).allowed,
    ).toBe(true);
  });

  it('invalidates cached workspace data after a mutation', async () => {
    const redis = fakeRedis();
    await setCachedJson(
      'workspace-config',
      'workspace-1',
      { name: 'Old' },
      60,
      redis,
    );
    expect(
      await getCachedJson('workspace-config', 'workspace-1', redis),
    ).toEqual({ name: 'Old' });
    await invalidateCacheSafe('workspace-config', 'workspace-1', redis);
    expect(
      await getCachedJson('workspace-config', 'workspace-1', redis),
    ).toBeNull();
  });
});
