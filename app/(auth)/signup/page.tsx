import type { Metadata } from 'next';
import { AuthForm } from '../auth-form';
import { safeNextPath } from '../../../lib/auth/redirect';

export const metadata: Metadata = {
  title: 'Create account | SupportSphere',
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
