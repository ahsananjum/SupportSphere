import { execFileSync } from 'node:child_process';

/** No .env loading, remote credentials, project-ref fallback, or printed keys. */
export function localTarget() {
  if (process.env.RUN_UPGRADE_LOCAL !== '1')
    throw new Error(
      'Set RUN_UPGRADE_LOCAL=1 explicitly for disposable local fixtures.',
    );
  const raw = execFileSync(
    process.execPath,
    ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    },
  );
  const values = JSON.parse(raw);
  const url = new URL(values.API_URL);
  if (
    url.origin !== 'http://127.0.0.1:54321' ||
    !values.SERVICE_ROLE_KEY ||
    !values.ANON_KEY
  )
    throw new Error(
      'Expected the explicit isolated local Supabase target on port 54321.',
    );
  return {
    url: url.origin,
    key: values.ANON_KEY,
    secret: values.SERVICE_ROLE_KEY,
  };
}

export function localAppEnv(target, port = 3101) {
  return {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_SUPABASE_URL: target.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: target.key,
    SUPABASE_SERVICE_ROLE_KEY: target.secret,
    REDIS_REST_URL: '',
    REDIS_REST_TOKEN: '',
    BREVO_API_KEY: '',
    AI_API_KEY: '',
    JOB_PROVIDER_TOKEN: '',
    JOB_SIGNING_SECRET: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
  };
}
