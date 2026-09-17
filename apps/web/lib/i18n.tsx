'use client';

import { errorMessage, type Lang } from '@grm/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiRequestError } from './api';
import { en, ka, type MessageKey } from './messages';

const STORAGE_KEY = 'grm_lang';
const dictionaries: Record<Lang, Record<MessageKey, string>> = { ka, en };

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  /** Human-readable, translated text for any thrown error (API error codes included). */
  errText: (err: unknown) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ka');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'ka' || stored === 'en') setLangState(stored);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => {
      let text: string = dictionaries[lang][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v));
      return text;
    },
    [lang],
  );

  const errText = useCallback(
    (err: unknown) => {
      if (err instanceof ApiRequestError) {
        const base = errorMessage(err.code, lang, err.message);
        return err.code === 'VALIDATION_FAILED' && err.message ? `${base}: ${err.message}` : base;
      }
      return err instanceof Error ? err.message : String(err);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t, errText }), [lang, setLang, t, errText]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider');
  return ctx;
}
