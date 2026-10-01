import type { MetadataRoute } from 'next';
import { isPublicOrigin, siteOrigin } from '../lib/seo';
import { publicPaths } from '../lib/marketing/pages';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isPublicOrigin()) return [];
  return publicPaths.map((path) => ({
    url: new URL(path, siteOrigin()).toString(),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.6,
  }));
}
