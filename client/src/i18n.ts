// i18n initialization — react-i18next + Vite dynamic imports.
//
// English is the default and fallback language. Locale bundles are lazy-loaded
// per language via Vite's import() so only the active locale is bundled at
// build time. European LTR languages only — no RTL layout concerns.
//
// Three namespaces: game, ui, narrative. Each maps to a JSON file under
// src/locales/{lang}/. The English bundle is loaded eagerly (inline) so the
// first render never flashes missing keys.

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import gameEn from './locales/en/game.json';
import uiEn from './locales/en/ui.json';
import narrativeEn from './locales/en/narrative.json';

const LANG_STORAGE_KEY = 'click_farm_lang';

function getSavedLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem(LANG_STORAGE_KEY) ?? 'en';
}

/** Available languages — add entries here when new locales are created. */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English',
  es: 'Espa\u00f1ol',
  ru: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439',
  de: 'Deutsch',
};

/**
 * Vite locale loaders — one explicit loader per non-English language.
 *
 * Vite's dynamic import glob analysis sees *all* files that match a template
 * literal pattern, regardless of runtime guards. Because English is already
 * statically imported (eager load for first render), a catch-all
 * `import(\`./locales/${lang}/…\`)` causes INEFFECTIVE_DYNAMIC_IMPORT
 * warnings. Explicit per-language loaders avoid the collision entirely and
 * give Vite clean chunk boundaries.
 *
 * When adding a new locale:
 *   1. Create src/locales/{lang}/ with game.json, ui.json, narrative.json
 *   2. Add a loader entry below
 *   3. Add the language to SUPPORTED_LANGUAGES
 */
const localeLoaders: Record<string, () => Promise<{
  game: Record<string, unknown>;
  ui: Record<string, unknown>;
  narrative: Record<string, unknown>;
}>> = {
  es: async () => {
    const [game, ui, narrative] = await Promise.all([
      import('./locales/es/game.json'),
      import('./locales/es/ui.json'),
      import('./locales/es/narrative.json'),
    ]);
    return { game: game.default ?? game, ui: ui.default ?? ui, narrative: narrative.default ?? narrative };
  },
  ru: async () => {
    const [game, ui, narrative] = await Promise.all([
      import('./locales/ru/game.json'),
      import('./locales/ru/ui.json'),
      import('./locales/ru/narrative.json'),
    ]);
    return { game: game.default ?? game, ui: ui.default ?? ui, narrative: narrative.default ?? narrative };
  },
  de: async () => {
    const [game, ui, narrative] = await Promise.all([
      import('./locales/de/game.json'),
      import('./locales/de/ui.json'),
      import('./locales/de/narrative.json'),
    ]);
    return { game: game.default ?? game, ui: ui.default ?? ui, narrative: narrative.default ?? narrative };
  },
};

/** Load a locale's three namespace bundles. English returns the eagerly-loaded
 *  bundles; every other language lazy-loads via its explicit Vite import. */
async function loadLocaleResources(lang: string): Promise<{
  game: Record<string, unknown>;
  ui: Record<string, unknown>;
  narrative: Record<string, unknown>;
}> {
  if (lang === 'en') return { game: gameEn, ui: uiEn, narrative: narrativeEn };
  const loader = localeLoaders[lang];
  if (!loader) throw new Error(`No locale loader registered for "${lang}"`);
  return loader();
}

/** Switch the active language. Lazy-loads the bundle if not already cached. */
export async function changeLanguage(lang: string): Promise<void> {
  if (!i18n.hasResourceBundle(lang, 'game')) {
    const resources = await loadLocaleResources(lang);
    i18n.addResourceBundle(lang, 'game', resources.game);
    i18n.addResourceBundle(lang, 'ui', resources.ui);
    i18n.addResourceBundle(lang, 'narrative', resources.narrative);
  }
  await i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        game: gameEn,
        ui: uiEn,
        narrative: narrativeEn,
      },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    ns: ['game', 'ui', 'narrative'],
    defaultNS: 'ui',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    react: {
      useSuspense: false,
    },
  });

/**
 * Translate a dynamic key — for keys stored as plain strings in display.ts
 * metadata objects. Bypasses the strict key-literal type check while still
 * resolving through the same i18next instance.
 *
 * Use t() for literal keys (type-checked). Use td() for runtime-computed
 * or metadata-stored keys (not type-checked, but still translated).
 */
export function td(key: string, opts?: Record<string, unknown>): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return i18n.t(key as any, opts as any) as string;
}

export default i18n;
