import type { Metadata } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import { isPublicOrigin, siteOrigin } from '../lib/seo';
import './globals.css';
import './marketing.css';

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});
const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: siteOrigin() ? new URL(siteOrigin()!) : undefined,
  title: { default: 'SupportSphere', template: '%s | SupportSphere' },
  description: 'A connected workspace for more thoughtful customer support.',
  applicationName: 'SupportSphere',
  robots: { index: isPublicOrigin(), follow: isPublicOrigin() },
  openGraph: {
    siteName: 'SupportSphere',
    type: 'website',
    title: 'SupportSphere',
    description: 'A calmer foundation for customer support.',
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${bricolage.variable} ${dmSans.variable}`}
    >
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
