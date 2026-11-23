import type { MetadataRoute } from 'next';
import { absoluteUrl, localePath, LOCALES, SITE_URL } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!SITE_URL) return [];
  const languages = {
    ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localePath(l))])),
    'x-default': absoluteUrl('/'),
  };
  return LOCALES.map((l) => ({
    url: absoluteUrl(localePath(l)),
    changeFrequency: 'monthly',
    priority: l === 'en' ? 1 : 0.9,
    alternates: { languages },
  }));
}
