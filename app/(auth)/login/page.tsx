import type { Metadata } from 'next';
import { safeNextPath } from '../../../lib/auth/redirect';
import { signInWithGoogle } from '../actions';
import { AuthForm } from '../auth-form';
import { SubmitButton } from '../../../components/shared/submit-button';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in securely to your SupportSphere workspace.',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reset?: string;
    signed_out?: string;
  }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const notice =
    params.reset === 'success'
      ? 'Password updated. Sign in with your new password.'
      : params.signed_out
        ? 'You have signed out.'
        : params.error
          ? 'Sign-in could not be completed. Please try again.'
          : undefined;
  return (
    <>
      <AuthForm mode="login" next={next} notice={notice} />
      <div className="auth-divider">
        <span>or</span>
      </div>
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <SubmitButton
          idle="Continue with Google"
          busy="Connecting…"
          className="secondary-button"
        />
      </form>
    </>
  );
}
