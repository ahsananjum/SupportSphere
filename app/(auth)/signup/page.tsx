import type { Metadata } from 'next';
import { AuthForm } from '../auth-form';
import { safeNextPath } from '../../../lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Create account',
  description:
    'Create a SupportSphere account and start a secure team workspace.',
  robots: { index: false, follow: false },
};
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  return <AuthForm mode="signup" next={safeNextPath(params.next)} />;
}
