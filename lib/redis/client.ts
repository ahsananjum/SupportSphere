import 'server-only';

import { getRedisEnv } from '../env';

export type RedisValue = string | number | null;
export type RedisClient = {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    options?: { ex?: number; nx?: boolean },
  ): Promise<'OK' | null>;
  del(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
};

type RedisResponse = { result?: unknown; error?: string };

class RestRedisClient implements RedisClient {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private async command(args: (string | number)[]) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) throw new Error(`REDIS_HTTP_${response.status}`);
    const body = (await response.json()) as RedisResponse;
    if (body.error) throw new Error('REDIS_COMMAND_FAILED');
    return body.result;
  }

  async get(key: string) {
    const value = await this.command(['GET', key]);
    return typeof value === 'string' ? value : null;
  }

  async set(
    key: string,
    value: string,
    options: { ex?: number; nx?: boolean } = {},
  ) {
    const args: (string | number)[] = ['SET', key, value];
    if (options.nx) args.push('NX');
    if (options.ex) args.push('EX', options.ex);
    const result = await this.command(args);
    return result === 'OK' ? 'OK' : null;
  }

  async del(key: string) {
    return Number(await this.command(['DEL', key]));
  }

  async incr(key: string) {
    return Number(await this.command(['INCR', key]));
  }

  async expire(key: string, seconds: number) {
    return Number(await this.command(['EXPIRE', key, seconds]));
  }
}

let client: RedisClient | null = null;

export function createRedisClient(
  values: Record<string, string | undefined> = process.env,
): RedisClient {
  const { REDIS_REST_URL, REDIS_REST_TOKEN } = getRedisEnv(values);
  return new RestRedisClient(REDIS_REST_URL, REDIS_REST_TOKEN);
}

export function getRedisClient() {
  if (!client) client = createRedisClient();
  return client;
}

export function resetRedisClientForTests() {
  client = null;
}

export async function tryRedis<T>(
  operation: (redis: RedisClient) => Promise<T>,
  fallback: T,
): Promise<{ value: T; available: boolean }> {
  try {
    return { value: await operation(getRedisClient()), available: true };
  } catch {
    return { value: fallback, available: false };
  }
}
