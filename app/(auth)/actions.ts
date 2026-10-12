'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '../../lib/supabase/server';
import { safeNextPath, trustedUrl } from '../../lib/auth/redirect';
import {
  authSchema,
  emailSchema,
  passwordSchema,
  signupSchema,
} from '../../lib/validation/auth';
import type { FormState } from '../../lib/action-state';
import { logEvent } from '../../lib/observability/log';
import { consumeRateLimit, RATE_LIMITS } from '../../lib/redis/rate-limit';
import { createAdminClient } from '../../lib/supabase/admin';
import { createHash } from 'node:crypto';

async function authAbuseLimit(
  bucket: 'auth' | 'signupInvite' | 'forgotPassword',
  email: string,
) {
  const requestHeaders = await headers();
  const ip =
    (process.env.VERCEL
      ? requestHeaders.get('x-vercel-forwarded-for')
      : requestHeaders.get('x-forwarded-for')
    )
      ?.split(',')[0]
      ?.trim() ?? 'unknown';
  const identifiers = [`auth-ip:${ip}`, `auth-email:${email.toLowerCase()}`];
  const results = await Promise.all(
    identifiers.map(async (identifier) => {
      if (process.env.REDIS_REST_URL && process.env.REDIS_REST_TOKEN)
        return (await consumeRateLimit(bucket, identifier)).allowed;
      // Atomic persistent backstop when Redis has not been provisioned. Browser
      // roles cannot invoke this RPC; no raw email/IP is persisted or logged.
      try {
        const config = RATE_LIMITS[bucket];
        const hash = createHash('sha256')
          .update(
            `${process.env.VERCEL_ENV ?? process.env.NODE_ENV}:${bucket}:${identifier}`,
          )
          .digest('hex');
        const { data, error } = await createAdminClient().rpc(
          'reserve_widget_rate',
          {
            p_bucket_key: hash,
            p_limit: config.limit,
            p_window_seconds: config.windowSeconds,
          },
        );
        return !error && data === true;
      } catch {
        return false;
      }
    }),
  );
  return results.every(Boolean);
}

function fieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  return Object.fromEntries(
    error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}

export async function signUp(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    displayName: formData.get('displayName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success)
    return {
      fields: fieldErrors(parsed.error),
      email: String(formData.get('email') ?? ''),
      values: { displayName: String(formData.get('displayName') ?? '') },
    };
  const next = safeNextPath(String(formData.get('next') ?? ''));
  if (!(await authAbuseLimit('signupInvite', parsed.data.email)))
    return {
      message: 'Too many signup attempts. Try again later.',
      email: parsed.data.email,
      values: { displayName: parsed.data.displayName },
    };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: trustedUrl(
        '/auth/callback?next=' + encodeURIComponent(next),
      ),
    },
  });
  if (error) {
    logEvent('auth.signup', 'failed', { errorClass: error.name });
    return {
      message:
        'We could not create your account. Check your details and try again.',
      email: parsed.data.email,
      values: { displayName: parsed.data.displayName },
    };
  }
  logEvent('auth.signup', 'accepted');
  if (data.session) redirect(next);
  return {
    success: 'Check your email for a confirmation link, then sign in.',
    email: parsed.data.email,
  };
}

export async function logIn(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = authSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success)
    return {
      fields: fieldErrors(parsed.error),
      email: String(formData.get('email') ?? ''),
    };
  const supabase = await createClient();
  if (!(await authAbuseLimit('auth', parsed.data.email)))
    return {
      message: 'Too many sign-in attempts. Try again later.',
      email: parsed.data.email,
    };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    logEvent('auth.login', 'failed', { errorClass: error.name });
    return {
      message:
        'Email or password was not accepted. Try again or reset your password.',
      email: parsed.data.email,
    };
  }
  logEvent('auth.login', 'succeeded');
  redirect(safeNextPath(String(formData.get('next') ?? '')));
}

export async function requestReset(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success)
    return { fields: { email: 'Enter a valid email address.' } };
  if (!(await authAbuseLimit('forgotPassword', parsed.data)))
    return {
      message: 'Too many reset requests. Try again later.',
      email: parsed.data,
    };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: trustedUrl('/auth/callback?next=/reset-password'),
  });
  if (error) {
    logEvent('auth.password_request', 'failed', { errorClass: error.name });
    return {
      message:
        error.status === 429
          ? 'Too many reset requests. Try again later.'
          : 'We could not send a reset link right now. Try again later.',
      email: parsed.data,
    };
  }
  logEvent('auth.password_request', 'accepted');
  return {
    success:
      'If this address has an account, a password reset link is on its way.',
    email: parsed.data,
  };
}

export async function updatePassword(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = passwordSchema.safeParse(formData.get('password'));
  if (!parsed.success)
    return {
      fields: {
        password: parsed.error.issues[0]?.message ?? 'Invalid password.',
      },
    };
  if (parsed.data !== formData.get('confirmPassword')) {
    return { fields: { confirmPassword: 'Passwords do not match.' } };
  }
  if (!(await cookies()).get('ss_recovery_ready')) {
    return {
      message: 'This reset link is invalid or has expired. Request a new one.',
    };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return {
      message: 'This reset link is invalid or has expired. Request a new one.',
    };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    logEvent('auth.password_update', 'failed', { errorClass: error.name });
    return {
      message:
        'We could not update your password. Request a new link and try again.',
    };
  }
  (await cookies()).set('ss_recovery_ready', '', {
    path: '/reset-password',
    maxAge: 0,
  });
  await supabase.auth.signOut();
  logEvent('auth.password_update', 'succeeded');
  redirect('/login?reset=success');
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const next = safeNextPath(String(formData.get('next') ?? ''));
  const callback = trustedUrl(
    '/auth/callback?next=' + encodeURIComponent(next),
  );
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback },
  });
  if (error || !data.url) {
    logEvent('auth.oauth_start', 'failed', {
      errorClass: error?.name ?? 'MissingUrl',
    });
    redirect('/login?error=oauth');
  }
  redirect(data.url);
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login?signed_out=1');
}
