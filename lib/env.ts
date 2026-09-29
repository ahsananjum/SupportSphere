import 'server-only';
import {
  parseAiEnv,
  parseAppEnv,
  parseEmailEnv,
  parseJobsEnv,
  parsePublicSupabaseEnv,
  parseRedisEnv,
  parseServerSupabaseEnv,
  parseStripeEnv,
  type AiEnv,
  type AppEnv,
  type EmailEnv,
  type JobsEnv,
  type PublicSupabaseEnv,
  type RedisEnv,
  type ServerSupabaseEnv,
  type StripeEnv,
} from './validation/env';

// Call at the provider boundary. P00 deliberately does not require provider keys to build.
export function getAppEnv(
  values: Record<string, string | undefined> = process.env,
): AppEnv {
  return parseAppEnv(values);
}

export function getPublicSupabaseEnv(
  values: Record<string, string | undefined> = process.env,
): PublicSupabaseEnv {
  return parsePublicSupabaseEnv(values);
}

export function getServerSupabaseEnv(
  values: Record<string, string | undefined> = process.env,
): ServerSupabaseEnv {
  return parseServerSupabaseEnv(values);
}

export function getRedisEnv(
  values: Record<string, string | undefined> = process.env,
): RedisEnv {
  return parseRedisEnv(values);
}

export function getEmailEnv(
  values: Record<string, string | undefined> = process.env,
): EmailEnv {
  return parseEmailEnv(values);
}

export function getAiEnv(
  values: Record<string, string | undefined> = process.env,
): AiEnv {
  return parseAiEnv(values);
}

export function getJobsEnv(
  values: Record<string, string | undefined> = process.env,
): JobsEnv {
  return parseJobsEnv(values);
}

export function getStripeEnv(
  values: Record<string, string | undefined> = process.env,
): StripeEnv {
  return parseStripeEnv(values);
}
