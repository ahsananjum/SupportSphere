import type { Metadata } from 'next';
import { AuthForm } from '../auth-form';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Request a secure SupportSphere password reset link.',
  robots: { index: false, follow: false },
};
export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
