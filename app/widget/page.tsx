import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getWidgetConfig } from '../../lib/widget/service';
import { verifyBootstrap } from '../../lib/widget/security';
import { WidgetClient } from './widget-client';
import './widget.css';

export const metadata: Metadata = {
  title: 'Support',
  robots: { index: false, follow: false },
};
export default async function WidgetPage({
  searchParams,
}: {
  searchParams: Promise<{ bootstrap?: string }>;
}) {
  const proof = verifyBootstrap((await searchParams).bootstrap ?? '');
  const referrer = (await headers()).get('referer');
  let hostOrigin: string | null = null;
  try {
    hostOrigin = referrer ? new URL(referrer).origin : null;
  } catch {
    /* invalid host */
  }
  if (!proof || hostOrigin !== proof.origin) notFound();
  const config = await getWidgetConfig(proof.key, proof.origin);
  if (!config) notFound();
  return (
    <main id="main-content" className="widget-root">
      <WidgetClient
        bootstrap={(await searchParams).bootstrap!}
        widgetKey={proof.key}
        hostOrigin={proof.origin}
        name={config.name}
      />
    </main>
  );
}
