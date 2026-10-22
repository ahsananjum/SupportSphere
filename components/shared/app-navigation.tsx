'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './app-navigation.module.css';
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
  const drawer = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const focusMainOnClose = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 800px)');
    const sync = () => {
      setMobile(query.matches);
      if (!query.matches) setOpen(false);
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  useEffect(() => {
    const panel = drawer.current;
    if (!panel) return;
    if (!mobile) {
      if (!panel.open) panel.show();
      return;
    }
    if (!open) {
      if (panel.open) panel.close();
      return;
    }
    const menuTrigger = menuButton.current;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const skip = document.querySelector<HTMLElement>('.skip-link');
    const skipWasInert = skip?.inert ?? false;
    if (skip) skip.inert = true;
    focusMainOnClose.current = false;
    panel.showModal();
    const focusFirst = () => {
      if (panel.open && open)
        panel.querySelector<HTMLElement>('button')?.focus();
    };
    focusFirst();
    const focusFrame = requestAnimationFrame(focusFirst);
    const focusTimer = window.setTimeout(focusFirst, 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key !== 'Tab' || !panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a,button:not([disabled]),select:not([disabled]),summary,[tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
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
    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(focusFrame);
      window.clearTimeout(focusTimer);
      panel.close();
      document.body.style.overflow = priorOverflow;
      if (skip) skip.inert = skipWasInert;
      requestAnimationFrame(() => {
        if (focusMainOnClose.current)
          document.getElementById('main-content')?.focus();
        else menuTrigger?.focus();
      });
    };
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
          { href: '/app/analytics', label: 'Analytics' },
          { href: '/app/ai/runs', label: 'AI runs' },
          { href: '/app/team', label: 'Team' },
          { href: '/app/notifications', label: 'Notifications' },
          ...(['owner', 'admin'].includes(active.role)
            ? [
                { href: '/app/settings/general', label: 'General settings' },
                { href: '/app/settings/widget', label: 'Website widget' },
                { href: '/app/settings/ai', label: 'AI policy' },
                { href: '/app/settings/integrations', label: 'Integrations' },
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
  const groups = [
    {
      label: 'Work',
      paths: [
        '/app',
        '/app/inbox',
        '/app/tickets',
        '/app/customers',
        '/app/onboarding',
      ],
    },
    {
      label: 'Operations',
      paths: [
        '/app/knowledge',
        '/app/automations',
        '/app/analytics',
        '/app/ai/runs',
      ],
    },
    { label: 'Workspace', paths: ['/app/team', '/app/notifications'] },
    {
      label: 'Settings',
      paths: [
        '/app/settings/general',
        '/app/settings/widget',
        '/app/settings/ai',
        '/app/settings/integrations',
        '/app/settings/security',
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: items.filter((item) => group.paths.includes(item.href)),
    }))
    .filter((group) => group.items.length);

  return (
    <div className={`workbench ${styles.shell}`}>
      <header className="workbench-header" inert={mobile && open}>
        <Link href="/app" className="app-logo">
          <span className="app-logo-name">SupportSphere</span>
          <span aria-hidden="true"> ✳</span>
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
        <dialog
          ref={drawer}
          id="workspace-menu"
          className={'workbench-sidebar' + (open ? ' is-open' : '')}
          aria-label="Workspace menu"
          aria-modal={mobile && open ? 'true' : undefined}
          role={mobile ? 'dialog' : 'complementary'}
          open={!mobile || undefined}
          onCancel={(event) => {
            event.preventDefault();
            setOpen(false);
          }}
          inert={mobile && !open}
        >
          <div className="sidebar-inner">
            {mobile && (
              <button
                type="button"
                className="workbench-menu-button drawer-close"
                onClick={() => setOpen(false)}
              >
                Close workspace menu <span aria-hidden="true">×</span>
              </button>
            )}
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
            <nav aria-label="Application navigation" className="workbench-nav">
              {groups.map((group) => (
                <div
                  key={group.label}
                  role="group"
                  aria-labelledby={`nav-${group.label}`}
                >
                  <p
                    id={`nav-${group.label}`}
                    className="sidebar-kicker nav-kicker"
                  >
                    {group.label}
                  </p>
                  <AnimatedBackground
                    key={pathname + group.label}
                    defaultValue={selected}
                    className="workbench-nav-highlight"
                  >
                    {group.items.map((item) => (
                      <span
                        data-id={item.href}
                        className="workbench-nav-item"
                        key={item.href}
                      >
                        <Link
                          href={item.href}
                          aria-current={
                            selected === item.href ? 'page' : undefined
                          }
                          onClick={() => {
                            focusMainOnClose.current = true;
                            setOpen(false);
                          }}
                        >
                          {item.label}
                          <span aria-hidden="true">↗</span>
                        </Link>
                      </span>
                    ))}
                  </AnimatedBackground>
                </div>
              ))}
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
        </dialog>
        <main
          id="main-content"
          className="workbench-main"
          tabIndex={-1}
          inert={mobile && open}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
