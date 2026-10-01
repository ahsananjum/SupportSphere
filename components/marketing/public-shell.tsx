import type { ReactNode } from 'react';
import { CookieNotice } from './cookie-notice';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import { MobileCta } from './mobile-cta';

export function PublicShell({
  children,
  stickyCta = true,
}: {
  children: ReactNode;
  stickyCta?: boolean;
}) {
  return (
    <div className={`marketing-site${stickyCta ? ' has-sticky-cta' : ''}`}>
      <SiteHeader />
      {children}
      <SiteFooter />
      <CookieNotice stickyCta={stickyCta} />
      {stickyCta && <MobileCta />}
    </div>
  );
}
