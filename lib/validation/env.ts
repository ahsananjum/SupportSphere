import { z } from 'zod';

const appSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url(),
});

const publicSupabaseSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSupabaseSchema = publicSupabaseSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

const redisSchema = z.object({
  REDIS_REST_URL: z.url(),
  REDIS_REST_TOKEN: z.string().min(1),
});

const emailSchema = z.object({
  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.email(),
  BREVO_SENDER_NAME: z.string().min(1),
});

const aiSchema = z.object({
  AI_PROVIDER: z.string().min(1),
  AI_API_KEY: z.string().min(1),
  AI_MODEL_SUPPORT: z.string().min(1),
  AI_MODEL_TRIAGE: z.string().min(1),
  AI_MODEL_QUALITY: z.string().min(1),
});

const jobsSchema = z.object({
  JOB_PROVIDER_TOKEN: z.string().min(1),
  JOB_SIGNING_SECRET: z.string().min(1),
});

const stripeSchema = z.object({
  STRIPE_SECRET_KEY: z.string().startsWith('sk_test_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_test_'),
});

export type AppEnv = z.infer<typeof appSchema>;
export type PublicSupabaseEnv = z.infer<typeof publicSupabaseSchema>;
export type ServerSupabaseEnv = z.infer<typeof serverSupabaseSchema>;
export type RedisEnv = z.infer<typeof redisSchema>;
export type EmailEnv = z.infer<typeof emailSchema>;
export type AiEnv = z.infer<typeof aiSchema>;
export type JobsEnv = z.infer<typeof jobsSchema>;
export type StripeEnv = z.infer<typeof stripeSchema>;

function parseEnvironment<T>(
  schema: z.ZodType<T>,
  values: Record<string, string | undefined>,
  label: string,
): T {
  const result = schema.safeParse(values);
  if (result.success) return result.data;

  const names = result.error.issues
    .map((issue) => issue.path.join('.'))
    .join(', ');
  throw new Error(`${label} configuration is missing or invalid: ${names}`);
}

export function parseAppEnv(
  values: Record<string, string | undefined>,
): AppEnv {
  return parseEnvironment(appSchema, values, 'App');
}

export function parsePublicSupabaseEnv(
  values: Record<string, string | undefined>,
): PublicSupabaseEnv {
  return parseEnvironment(publicSupabaseSchema, values, 'Supabase public');
}

export function parseServerSupabaseEnv(
  values: Record<string, string | undefined>,
): ServerSupabaseEnv {
  return parseEnvironment(serverSupabaseSchema, values, 'Supabase server');
}

export function parseRedisEnv(
  values: Record<string, string | undefined>,
): RedisEnv {
  return parseEnvironment(redisSchema, values, 'Redis');
}

export function parseEmailEnv(
  values: Record<string, string | undefined>,
): EmailEnv {
  return parseEnvironment(emailSchema, values, 'Brevo');
}

export function parseAiEnv(values: Record<string, string | undefined>): AiEnv {
  return parseEnvironment(aiSchema, values, 'AI');
}

export function parseJobsEnv(
  values: Record<string, string | undefined>,
): JobsEnv {
  return parseEnvironment(jobsSchema, values, 'Jobs');
}

export function parseStripeEnv(
  values: Record<string, string | undefined>,
): StripeEnv {
  return parseEnvironment(stripeSchema, values, 'Stripe test');
}
