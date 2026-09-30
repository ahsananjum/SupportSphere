import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="auth-shell">
      <div className="auth-brand">
        <Link href="/" className="auth-logo">
          SupportSphere<span aria-hidden="true"> ●</span>
        </Link>
        <p>One calm place to support every customer.</p>
      </div>
      <div className="auth-panel">{children}</div>
    </main>
  );
}
