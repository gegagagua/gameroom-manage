import '@fontsource-variable/onest';
import '@fontsource-variable/noto-sans-georgian';
import './landing.css';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { CONTENT } from '@/lib/content';
import {
  absoluteUrl,
  asset,
  GOOGLE_SITE_VERIFICATION,
  isLocale,
  localePath,
  LOCALES,
  OG_LOCALES,
  PRODUCT_NAME,
  SITE_URL,
} from '@/lib/site';

export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((lang) => ({ lang }));
export const viewport: Viewport = { themeColor: '#0c4335', width: 'device-width', initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const c = CONTENT[lang];
  const url = absoluteUrl(localePath(lang));
  const image = `${SITE_URL || 'http://localhost:3001'}/media/og.jpg`;
  return {
    metadataBase: new URL(SITE_URL || 'http://localhost:3001'),
    title: c.metaTitle,
    description: c.metaDescription,
    applicationName: PRODUCT_NAME,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(LOCALES.map((l) => [l, absoluteUrl(localePath(l))])),
        'x-default': absoluteUrl('/'),
      },
    },
    openGraph: {
      type: 'website',
      siteName: PRODUCT_NAME,
      title: c.metaTitle,
      description: c.metaDescription,
      url,
      locale: OG_LOCALES[lang],
      alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => OG_LOCALES[l]),
      images: [{ url: image, width: 1200, height: 630, alt: c.gallery.shots[1].alt }],
    },
    twitter: { card: 'summary_large_image', title: c.metaTitle, description: c.metaDescription, images: [image] },
    icons: { icon: asset('icon.svg') },
    // Until the real domain is configured, nothing should be indexed under a wrong canonical.
    robots: SITE_URL ? { index: true, follow: true } : { index: false, follow: false },
    verification: GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export default async function LandingLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={lang}>
      <body className="site">{children}</body>
    </html>
  );
}
