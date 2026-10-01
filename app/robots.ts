import type { MetadataRoute } from 'next';
import { isPublicOrigin, siteOrigin } from '../lib/seo';

export default function robots(): MetadataRoute.Robots {
  if (!isPublicOrigin()) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/app',
        '/auth',
        '/invite',
        '/login',
        '/signup',
        '/forgot-password',
        '/reset-password',
      ],
    },
    sitemap: `${siteOrigin()}/sitemap.xml`,
  };
}
