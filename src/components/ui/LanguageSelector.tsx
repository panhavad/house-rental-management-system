"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { LANGUAGE_COOKIE } from "@/lib/language-shared";
import { SUPPORTED_LANGUAGES, type Locale } from "@/lib/language-catalog";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function LanguageSelector({ dark = false }: { dark?: boolean }) {
  const router = useRouter();
  const { locale, t } = useLanguage();

  function changeLanguage(nextLocale: Locale) {
    document.cookie = `${LANGUAGE_COOKIE}=${nextLocale}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }

  return (
    <label className={`inline-flex items-center gap-1.5 text-sm ${dark ? "text-slate-200" : "text-slate-600"}`}>
      <Languages className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t("Language")}</span>
      <select
        value={locale}
        onChange={(event) => changeLanguage(event.target.value as Locale)}
        aria-label={t("Language")}
        className={`rounded-md border px-2 py-1.5 text-sm ${
          dark ? "border-slate-600 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-700"
        }`}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
