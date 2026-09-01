"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { UtilityType } from "@prisma/client";

export async function createUtilityRate(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.RATES_WRITE);

  const type = String(formData.get("type") ?? "") as UtilityType;
  const pricePerUnit = Number(formData.get("pricePerUnit") ?? 0);

  if (type !== "WATER" && type !== "ELECTRICITY") throw new Error("Invalid utility type.");
  if (pricePerUnit <= 0) throw new Error("Price per unit must be greater than zero.");

  const rate = await prisma.utilityRate.create({ data: { type, pricePerUnit, workspaceId: user.workspaceId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "RATE",
    entityId: rate.id,
    action: "RATE_CREATED",
    description: `New ${rate.type.toLowerCase()} rate set to ${rate.pricePerUnit} per unit.`,
    performedById: user.id,
  });

  revalidatePath("/settings/rates");
}
