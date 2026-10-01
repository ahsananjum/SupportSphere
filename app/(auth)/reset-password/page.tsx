import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { cookies } from 'next/headers';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = {
  title: 'Choose a password',
  description: 'Choose a new password for your SupportSphere account.',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !(await cookies()).get('ss_recovery_ready'))
    return (
      <section>
        <h1 className="auth-title">Reset link unavailable</h1>
        <p className="auth-intro">This reset link is invalid or has expired.</p>
        <Link className="primary-button inline-button" href="/forgot-password">
          Request a new link
        </Link>
      </section>
    );
  return <AuthForm mode="reset" />;
}
