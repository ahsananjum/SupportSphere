'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatedBackground } from '../motion-primitives/animated-background';

export function AppNavigation({ hasWorkspace }: { hasWorkspace: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Workspace navigation" className="app-nav">
      {hasWorkspace ? (
        <AnimatedBackground
          defaultValue={pathname.startsWith('/app/team') ? 'team' : 'overview'}
          className="app-nav-highlight"
        >
          <span data-id="overview" className="app-nav-item">
            <Link
              href="/app"
              aria-current={pathname === '/app' ? 'page' : undefined}
            >
              Overview
            </Link>
          </span>
          <span data-id="team" className="app-nav-item">
            <Link
              href="/app/team"
              aria-current={
                pathname.startsWith('/app/team') ? 'page' : undefined
              }
            >
              Team
            </Link>
          </span>
        </AnimatedBackground>
      ) : (
        <Link href="/app" aria-current="page">
          Overview
        </Link>
      )}
    </nav>
  );
}
