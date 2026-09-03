import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type { AppSettings } from "@/lib/currency-format";
export { CURRENCY_LABELS, convertFromUsd, convertToUsd, formatMoney } from "@/lib/currency-format";
import type { AppSettings } from "@/lib/currency-format";

/**
 * Loads a workspace's currency settings, creating the default row (USD, rate 4100)
 * if it doesn't exist yet. Cached per request (per workspaceId) so multiple
 * components on the same page don't each issue a separate database query.
 */
export const getAppSettings = cache(async (workspaceId: string): Promise<AppSettings> => {
  const settings = await prisma.appSetting.findUnique({ where: { workspaceId } });
  if (settings) return settings;

  // Workspace creation normally seeds this row. Retain support for legacy
  // workspaces without turning every page render into a SQLite write.
  return prisma.appSetting.upsert({
    where: { workspaceId },
    update: {},
    create: { workspaceId },
  });
});
