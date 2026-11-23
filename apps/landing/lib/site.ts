export const LOCALES = ['en', 'ka', 'ru', 'tr', 'de'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const isLocale = (value: string): value is Locale => (LOCALES as readonly string[]).includes(value);

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ka: 'ქართული',
  ru: 'Русский',
  tr: 'Türkçe',
  de: 'Deutsch',
};

export const OG_LOCALES: Record<Locale, string> = {
  en: 'en_US',
  ka: 'ka_GE',
  ru: 'ru_RU',
  tr: 'tr_TR',
  de: 'de_DE',
};

export const PRODUCT_NAME = 'Game Room Manage';
export const CONTACT_PHONE = '+995597887736';
export const CONTACT_PHONE_LABEL = '+995 597 88 77 36';
export const CONTACT_EMAIL = 'gegagagua@gmail.com';

export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
/** Public origin, plus the base path when the site lives under one. Unset means "do not index". */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/$/, '');
/** The separate staff/customer web app. The Sign in link is hidden while this is empty. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '');
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? '';
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? '';

export const localePath = (locale: Locale) => (locale === DEFAULT_LOCALE ? '/' : `/${locale}`);
export const absoluteUrl = (path: string) => `${SITE_URL || 'http://localhost:3001'}${path === '/' ? '' : path}` || '/';
export const asset = (file: string) => `${BASE_PATH}/media/${file}`;
