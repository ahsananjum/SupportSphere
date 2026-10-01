import Link from 'next/link';
import type { ReactNode } from 'react';
import { AuthLiveLines } from '../../components/marketing/auth-live-lines';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="auth-page-wrapper">
      <div className="auth-container">
        <div className="auth-brand">
          <AuthLiveLines className="auth-wave-bg" />
          <div className="auth-brand-top">
            <Link
              href="/"
              className="auth-logo"
              aria-label="SupportSphere Home"
            >
              <span className="auth-logo-mark" aria-hidden="true">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="18" height="18" x="3" y="3" rx="4" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </span>
              <span className="auth-logo-text">SupportSphere</span>
              <span className="auth-logo-asterisk" aria-hidden="true">
                ✳
              </span>
            </Link>

            <div className="auth-live-pill" aria-label="System status">
              <span className="auth-live-dot" aria-hidden="true" />
              <span>Live Workbench</span>
            </div>
          </div>

          {/* Live Support Dispatch Preview Card */}
          <div className="auth-showcase-card" aria-hidden="true">
            <div className="auth-showcase-badge">
              <span>● Active Triage Dispatch</span>
              <span className="auth-showcase-time">⚡ Realtime</span>
            </div>
            <h2 className="auth-showcase-title">
              “Priority inquiry #1042: SLA guarantee &amp; workspace routing”
            </h2>
            <p className="auth-showcase-desc">
              Automated triage matched inquiry with agent workbench in 180ms.
            </p>
            <div className="auth-showcase-tags">
              <span className="showcase-tag tag-urgent">Priority: Urgent</span>
              <span className="showcase-tag tag-mint">
                Auto-routed to Agent
              </span>
            </div>
            <div className="auth-showcase-progress">
              <div className="auth-progress-fill" />
            </div>
          </div>

          <div className="auth-quote">
            <p>“One secure workspace for the people behind every answer.”</p>
            <cite>— SupportSphere Workbench</cite>
          </div>
        </div>

        <div className="auth-panel">
          <nav className="auth-nav-top" aria-label="Back to home">
            <Link href="/" className="auth-back-link">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Home</span>
            </Link>
          </nav>
          <div className="auth-content-container">{children}</div>
        </div>
      </div>
    </main>
  );
}
