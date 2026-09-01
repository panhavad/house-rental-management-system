import { cache } from "react";
import { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AppSettings = {
  currency: Currency;
  exchangeRate: number;
};

/**
 * Loads a workspace's currency settings, creating the default row (USD, rate 4100)
 * if it doesn't exist yet. Cached per request (per workspaceId) so multiple
 * components on the same page don't each issue a separate database query.
 */
export const getAppSettings = cache(async (workspaceId: string): Promise<AppSettings> => {
  return prisma.appSetting.upsert({
    where: { workspaceId },
    update: {},
    create: { workspaceId },
  });
});

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
