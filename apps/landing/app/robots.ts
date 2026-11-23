import type { MetadataRoute } from 'next';
import { BASE_PATH, SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  if (!SITE_URL) return { rules: { userAgent: '*', disallow: '/' } };
  return {
    rules: { userAgent: '*', allow: `${BASE_PATH}/`, disallow: `${BASE_PATH}/api/` },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
