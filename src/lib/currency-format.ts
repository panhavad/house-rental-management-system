import type { Currency } from "@prisma/client";

/**
 * Pure, browser-safe currency formatting — deliberately has zero imports
 * beyond a type-only reference to the `Currency` enum, so client components
 * (e.g. the invoice "share as image" preview) can import this without
 * pulling in `@/lib/prisma` (and therefore `@prisma/client`'s Node-only
 * runtime) the way importing from `@/lib/currency` would.
 */
export type AppSettings = {
  currency: Currency;
  exchangeRate: number;
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  USD: "US Dollar (USD)",
  KHR: "Cambodian Riel (KHR)",
};

/** All monetary values are stored in the database as USD. Converts to the display currency. */
export function convertFromUsd(amountUsd: number, settings: AppSettings): number {
  return settings.currency === "USD" ? amountUsd : amountUsd * settings.exchangeRate;
}

/** Converts a value entered in the display currency back to USD for storage. */
export function convertToUsd(amount: number, settings: AppSettings): number {
  return settings.currency === "USD" ? amount : amount / settings.exchangeRate;
}

/** Formats a USD-stored amount into the currently configured display currency. */
export function formatMoney(amountUsd: number, settings: AppSettings): string {
  const converted = convertFromUsd(amountUsd, settings);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: settings.currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: settings.currency === "KHR" ? 0 : 2,
    maximumFractionDigits: settings.currency === "KHR" ? 0 : 2,
  }).format(converted);
}
