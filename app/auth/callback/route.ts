import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { safeNextPath } from '../../../lib/auth/redirect';
import { logEvent } from '../../../lib/observability/log';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get('next'));
  const fallback =
    next === '/reset-password'
      ? '/reset-password?error=invalid'
      : '/login?error=callback';
  if (url.searchParams.has('error')) {
    logEvent('auth.callback', 'provider_error');
    return NextResponse.redirect(new URL(fallback, url.origin));
  }

  const supabase = await createClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  let error;
  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && url.searchParams.get('type') === 'recovery') {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    }));
  } else if (
    tokenHash &&
    ['email', 'signup'].includes(url.searchParams.get('type') ?? '')
  ) {
    ({ error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    }));
  } else {
    return NextResponse.redirect(new URL(fallback, url.origin));
  }
  if (error) {
    logEvent('auth.callback', 'failed', { errorClass: error.name });
    return NextResponse.redirect(new URL(fallback, url.origin));
  }
  logEvent('auth.callback', 'succeeded');
  const response = NextResponse.redirect(new URL(next, url.origin));
  if (next === '/reset-password') {
    response.cookies.set('ss_recovery_ready', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/reset-password',
      maxAge: 900,
    });
  }
  return response;
}
