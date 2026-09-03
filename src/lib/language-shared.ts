import type { Locale } from "@/lib/language-catalog";

/**
 * Language helpers that are safe in both Server and Client Components. The
 * cookie name lives here rather than in `language.ts` because that module
 * imports `next/headers`, which cannot be pulled into a client bundle.
 */

export const LANGUAGE_COOKIE = "rentalhrm_language";

export type Translations = Record<string, string>;
export type Translator = (key: string, values?: Record<string, string | number>) => string;

export function createTranslator(locale: Locale, translations: Translations): Translator {
  return (key, values = {}) => {
    let result = locale === "en" ? key : translations[key]?.trim() || key;
    for (const [name, value] of Object.entries(values)) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  };
}
