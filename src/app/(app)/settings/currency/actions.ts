"use server";

import { revalidatePath } from "next/cache";
import { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { CURRENCY_LABELS } from "@/lib/currency";

export async function updateCurrencySettings(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CURRENCY_WRITE);

  const currency = String(formData.get("currency") ?? "") as Currency;
  const exchangeRate = Number(formData.get("exchangeRate") ?? 0);

  if (currency !== "USD" && currency !== "KHR") {
    throw new Error("Invalid currency.");
  }
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Exchange rate must be a positive number.");
  }

  const settings = await prisma.appSetting.upsert({
    where: { workspaceId: user.workspaceId },
    update: { currency, exchangeRate },
    create: { workspaceId: user.workspaceId, currency, exchangeRate },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "SETTINGS",
    entityId: user.workspaceId,
    action: "CURRENCY_UPDATED",
    description:
      settings.currency === "USD"
        ? `System currency set to ${CURRENCY_LABELS.USD}.`
        : `System currency set to ${CURRENCY_LABELS[settings.currency]} (1 USD = ${settings.exchangeRate} ${settings.currency}).`,
    performedById: user.id,
  });

  // Currency affects money displayed across nearly every page.
  revalidatePath("/", "layout");
}
