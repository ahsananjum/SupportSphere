'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

const navigation = [
  { href: '/features', label: 'Features' },
  { href: '/ai-support', label: 'AI support' },
  { href: '/knowledge-base', label: 'Knowledge' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/security', label: 'Security' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
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
        {navigation.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
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
        <summary>
          Menu <span aria-hidden="true">＋</span>
        </summary>
        <nav aria-label="Mobile navigation">
          {navigation.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeMenu}
              aria-current={pathname === href ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
          <Link href="/about" onClick={closeMenu}>
            About
          </Link>
          <Link href="/contact" onClick={closeMenu}>
            Contact
          </Link>
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
