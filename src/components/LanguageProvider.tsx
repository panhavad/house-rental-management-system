"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/language-catalog";
import { createTranslator, type Translations, type Translator } from "@/lib/language-shared";

const LanguageContext = createContext<{ locale: Locale; t: Translator }>({
  locale: "en",
  t: (key) => key,
});

/**
 * Makes the active language available to Client Components. Translation happens
 * during render rather than by rewriting the DOM afterwards: the provider is
 * handed the pack by the server, so a component that calls `t()` produces the
 * same text while server-rendering and while hydrating. Rewriting server-
 * rendered text from an effect instead would race React's hydration — pages sit
 * behind Suspense boundaries that hydrate in later commits, so React would find
 * translated text where it expected English and rebuild those subtrees.
 */
export function LanguageProvider({
  locale,
  translations,
  children,
}: {
  locale: Locale;
  translations: Translations;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: createTranslator(locale, translations) }), [locale, translations]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/**
 * Translates plain text passed as `children`, leaving nested elements untouched.
 * This lets shared primitives (buttons, links, field labels) localize their own
 * label without every caller reaching for `t()`. Surrounding whitespace is kept
 * so inline text keeps its spacing.
 */
export function translateChildren(children: ReactNode, t: Translator): ReactNode {
  if (typeof children === "string") {
    const trimmed = children.trim();
    if (!trimmed) return children;
    const translated = t(trimmed);
    return translated === trimmed ? children : children.replace(trimmed, translated);
  }
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === "string" ? translateChildren(child, t) : child));
  }
  return children;
}

/** Hook form of `translateChildren`, for use inside Client Components. */
export function useTranslatedChildren(children: ReactNode): ReactNode {
  const { t } = useLanguage();
  return useMemo(() => translateChildren(children, t), [children, t]);
}

/**
 * Translates a single string. Exists so Server Components can localize a label
 * without becoming Client Components themselves: they keep receiving props that
 * do not cross the server/client boundary (a Lucide icon component, for
 * example) and delegate only the text to this client-side leaf.
 */
export function TranslatedText({ children }: { children: string }) {
  const { t } = useLanguage();
  return <>{t(children)}</>;
}
