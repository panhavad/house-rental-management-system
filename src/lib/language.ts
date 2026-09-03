import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CATALOG_KEYS, DEFAULT_KHMER_TRANSLATIONS, type Locale } from "@/lib/language-catalog";
import { LANGUAGE_COOKIE, createTranslator, type Translations, type Translator } from "@/lib/language-shared";

export { LANGUAGE_COOKIE };
export type { Translations };

export function isLocale(value: string | undefined): value is Locale {
  return value === "en" || value === "km";
}

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export function parseTranslations(value: string): Translations {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] => CATALOG_KEYS.has(entry[0]) && typeof entry[1] === "string"
      )
    );
  } catch {
    return {};
  }
}

/**
 * Loads a locale's translations, falling back to the built-in defaults if the
 * stored pack can't be read. This runs in the root layout, so a database that
 * hasn't had the language-pack migration applied yet (or a transient query
 * failure) must degrade to untranslated text rather than break every page.
 */
export async function getTranslations(locale: Locale): Promise<Translations> {
  if (locale === "en") return {};
  try {
    const pack = await prisma.languagePack.findUnique({ where: { code: locale } });
    if (pack) return { ...DEFAULT_KHMER_TRANSLATIONS, ...parseTranslations(pack.translations) };
  } catch (error) {
    console.error("Failed to load the stored language pack; using built-in translations.", error);
  }
  return DEFAULT_KHMER_TRANSLATIONS;
}

export async function getActiveLanguage() {
  const locale = await getLocale();
  return { locale, translations: await getTranslations(locale) };
}

/** Translator for Server Components and server actions. */
export async function getTranslator(): Promise<Translator> {
  const { locale, translations } = await getActiveLanguage();
  return createTranslator(locale, translations);
}
