// i18next type augmentation.
//
// Locale JSON types are exported for downstream validation. The t() function
// accepts any string key — this codebase stores i18n keys as plain strings
// in display metadata objects and uses cross-namespace prefixed keys, so
// strict literal-union key checking is not practical.

import 'i18next';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'ui';
    returnNull: false;
    returnObjects: false;
  }
}

// Re-export JSON types for consumers who want to validate key paths.
export type { default as GameLocale } from './locales/en/game.json';
export type { default as UiLocale } from './locales/en/ui.json';
export type { default as NarrativeLocale } from './locales/en/narrative.json';
