import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Isolated verification must not share a dev lock/output with the owner's app.
  distDir: process.env.RUN_UPGRADE_LOCAL === '1' ? '.next-u0' : '.next',
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '5mb' } },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const localVerificationSources =
      process.env.RUN_UPGRADE_LOCAL === '1'
        ? ' http://127.0.0.1:54321 ws://127.0.0.1:54321'
        : '';
    const scriptSource = isProduction
      ? "'self' 'unsafe-inline'"
      : "'self' 'unsafe-inline' 'unsafe-eval'";
    const contentSecurityPolicy = (frameAncestors: string) =>
      `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors ${frameAncestors}; form-action 'self' https://accounts.google.com; script-src ${scriptSource}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com${localVerificationSources}; frame-src 'self' https://*.supabase.co;`;
    return [
      {
        source: '/((?!widget(?:/|$)).*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          // The public widget loader is intentionally fetched cross-origin;
          // its API still enforces the configured host origin and signed proof.
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: contentSecurityPolicy("'self'"),
          },
          ...(isProduction
            ? [
                {
                  key: 'Strict-Transport-Security',
                  value: 'max-age=31536000; includeSubDomains',
                },
              ]
            : []),
        ],
      },
      {
        source: '/widget/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy('*') },
        ],
      },
    ];
  },
};

export default nextConfig;
