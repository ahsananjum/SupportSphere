import type { Metadata } from 'next';
import { isPublicOrigin, siteOrigin } from '../seo';

export function publicMetadata(input: {
  path: string;
  title: string;
  description: string;
  index?: boolean;
}): Metadata {
  const origin = isPublicOrigin() ? siteOrigin() : undefined;
  const url = origin ? new URL(input.path, origin).toString() : undefined;
  const index = input.index !== false && isPublicOrigin();
  return {
    title: input.title,
    description: input.description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index, follow: index },
    openGraph: {
      type: 'website',
      url,
      siteName: 'SupportSphere',
      title: input.title,
      description: input.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
    },
  };
}
