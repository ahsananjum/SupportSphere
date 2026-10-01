import Link from 'next/link';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="auth-shell">
      <div className="auth-brand">
        <Link href="/" className="auth-logo">
          SupportSphere<span aria-hidden="true"> ✳</span>
        </Link>
        <div className="auth-brand-copy">
          <p>Make room for better support.</p>
          <span>One secure workspace for the people behind every answer.</span>
        </div>
      </div>
      <div className="auth-panel">{children}</div>
    </main>
  );
}
