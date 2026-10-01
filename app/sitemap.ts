import type { MetadataRoute } from 'next';
import { isPublicOrigin, siteOrigin } from '../lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isPublicOrigin()) return [];
  return [{ url: `${siteOrigin()}/`, changeFrequency: 'monthly', priority: 1 }];
}
