import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SupportSphere',
  description: 'SupportSphere project foundation.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
