'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatedBackground } from '../motion-primitives/animated-background';
import { SubmitButton } from './submit-button';
import { logOut } from '../../app/(auth)/actions';
import { switchWorkspace } from '../../app/app/actions';

type Membership = {
  id: string;
  name: string;
  role: string;
  onboardingCompletedAt?: string | null;
};
type Props = {
  active: Membership | null;
  memberships: Membership[];
  email: string;
  children: React.ReactNode;
};

export function AppNavigation({ active, memberships, email, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const drawer = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 800px)');
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const panel = drawer.current;
    panel?.querySelector<HTMLElement>('a,button,select')?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>('a,button,select'),
      );
      const first = focusables[0];
      const last = focusables.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, mobile]);

  const ready = Boolean(active?.onboardingCompletedAt);
  const items =
    !active || !ready
      ? [
          {
            href: active ? '/app/onboarding' : '/app',
            label: active ? 'Setup' : 'Create workspace',
          },
        ]
      : [
          { href: '/app', label: 'Overview' },
          { href: '/app/inbox', label: 'Inbox' },
          { href: '/app/tickets', label: 'Tickets' },
          { href: '/app/customers', label: 'Customers' },
          { href: '/app/knowledge', label: 'Knowledge' },
          { href: '/app/automations', label: 'Automations' },
          { href: '/app/ai/runs', label: 'AI runs' },
          { href: '/app/team', label: 'Team' },
          { href: '/app/notifications', label: 'Notifications' },
          ...(['owner', 'admin'].includes(active.role)
            ? [
                { href: '/app/settings/general', label: 'General settings' },
                { href: '/app/settings/widget', label: 'Website widget' },
                { href: '/app/settings/ai', label: 'AI policy' },
              ]
            : []),
          ...(active.role === 'owner'
            ? [{ href: '/app/settings/security', label: 'Security' }]
            : []),
        ];
  const selected = items.find(
    (item) =>
      pathname === item.href ||
      (item.href !== '/app' && pathname.startsWith(item.href + '/')),
  )?.href;

  return (
    <div className="workbench">
      <header className="workbench-header">
        <Link href="/app" className="app-logo">
          SupportSphere<span aria-hidden="true"> ✳</span>
        </Link>
        <div className="workbench-header-right">
          {active && <span className="workbench-current">{active.name}</span>}
          <button
            ref={menuButton}
            type="button"
            className="workbench-menu-button"
            aria-label={open ? 'Close workspace menu' : 'Open workspace menu'}
            aria-expanded={open}
            aria-controls="workspace-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? 'Close' : 'Menu'}
            <span aria-hidden="true"> {open ? '×' : '☰'}</span>
          </button>
        </div>
      </header>
      <div className="workbench-body">
        {open && mobile && (
          <button
            type="button"
            className="workbench-scrim"
            aria-label="Close workspace menu"
            onClick={() => {
              setOpen(false);
              menuButton.current?.focus();
            }}
          />
        )}
        <aside
          ref={drawer}
          id="workspace-menu"
          className={'workbench-sidebar' + (open ? ' is-open' : '')}
          aria-label="Workspace menu"
          aria-modal={mobile && open ? 'true' : undefined}
          role={mobile && open ? 'dialog' : undefined}
          inert={mobile && !open}
        >
          <div className="sidebar-inner">
            <p className="sidebar-kicker">
              WORKSPACE / {active?.role?.toUpperCase() ?? 'NEW'}
            </p>
            {memberships.length > 0 && (
              <form action={switchWorkspace} className="switch-form">
                <label htmlFor="workspaceId">Active workspace</label>
                <select
                  id="workspaceId"
                  name="workspaceId"
                  defaultValue={active?.id}
                  key={active?.id}
                >
                  {memberships.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <SubmitButton
                  idle="Switch workspace"
                  busy="Switching…"
                  className="sidebar-button"
                />
              </form>
            )}
            <p className="sidebar-kicker nav-kicker">NAVIGATION</p>
            <nav aria-label="Application navigation" className="workbench-nav">
              <AnimatedBackground
                key={pathname}
                defaultValue={selected}
                className="workbench-nav-highlight"
              >
                {items.map((item) => (
                  <span
                    data-id={item.href}
                    className="workbench-nav-item"
                    key={item.href}
                  >
                    <Link
                      href={item.href}
                      aria-current={selected === item.href ? 'page' : undefined}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  </span>
                ))}
              </AnimatedBackground>
            </nav>
            <div className="sidebar-account">
              <span>Signed in as</span>
              <strong>{email}</strong>
              <form action={logOut}>
                <SubmitButton
                  idle="Sign out"
                  busy="Signing out…"
                  className="text-button"
                />
              </form>
            </div>
          </div>
        </aside>
        <main id="main-content" className="workbench-main">
          {children}
        </main>
      </div>
    </div>
  );
}
