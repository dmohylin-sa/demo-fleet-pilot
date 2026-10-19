// Tiny i18n layer: flat dictionaries per area, English fallback, `{name}` interpolation.
// Data objects shaped { en, he } are picked with L().
import { useCallback } from 'react';
import { useStore } from '../mock-backend/store.js';
import common from './common.js';
import phone from './phone.js';
import consoleStrings from './console.js';

const dict = {
  en: { ...common.en, ...phone.en, ...consoleStrings.en },
  he: { ...common.he, ...phone.he, ...consoleStrings.he },
};

export function translate(lang, key, params) {
  let s = dict[lang]?.[key] ?? dict.en[key] ?? key;
  if (params) Object.entries(params).forEach(([k, v]) => (s = s.replaceAll(`{${k}}`, v)));
  return s;
}

export const pickLang = (lang, v) => (v && typeof v === 'object' && 'en' in v ? v[lang] ?? v.en : v);

export function useI18n() {
  const lang = useStore((s) => s.demo.lang);
  const t = useCallback((key, params) => translate(lang, key, params), [lang]);
  const L = useCallback((v) => pickLang(lang, v), [lang]);
  return { t, L, lang, dir: lang === 'he' ? 'rtl' : 'ltr' };
}

export const allKeys = () => ({ en: Object.keys(dict.en), he: Object.keys(dict.he) });
