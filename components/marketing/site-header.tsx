'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

export function SiteHeader() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  const anchor = (id: string) => (pathname === '/' ? `#${id}` : `/#${id}`);
  const closeMenu = () => {
    if (menu.current) menu.current.open = false;
  };

  return (
    <header className="marketing-header">
      <Link href="/" className="brand-mark" aria-label="SupportSphere home">
        <span className="brand-symbol" aria-hidden="true">
          ✳
        </span>
        SupportSphere
      </Link>
      <nav className="marketing-nav" aria-label="Primary navigation">
        <a href={anchor('approach')}>Approach</a>
        <a href={anchor('workflow')}>Workflow</a>
        <a href={anchor('security')}>Security</a>
        <a href={anchor('faq')}>FAQ</a>
      </nav>
      <div className="marketing-account">
        <Link href="/login" className="quiet-link">
          Sign in
        </Link>
        <Link href="/signup" className="marketing-button marketing-button-dark">
          Create a workspace <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <details
        className="mobile-menu"
        ref={menu}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            closeMenu();
            menu.current?.querySelector('summary')?.focus();
          }
        }}
      >
        <summary aria-label="Open navigation menu">
          Menu <span aria-hidden="true">＋</span>
        </summary>
        <nav aria-label="Mobile navigation">
          <a href={anchor('approach')} onClick={closeMenu}>
            Approach
          </a>
          <a href={anchor('workflow')} onClick={closeMenu}>
            Workflow
          </a>
          <a href={anchor('security')} onClick={closeMenu}>
            Security
          </a>
          <a href={anchor('faq')} onClick={closeMenu}>
            FAQ
          </a>
          <Link href="/login" onClick={closeMenu}>
            Sign in
          </Link>
          <Link href="/signup" onClick={closeMenu}>
            Create a workspace
          </Link>
        </nav>
      </details>
    </header>
  );
}
