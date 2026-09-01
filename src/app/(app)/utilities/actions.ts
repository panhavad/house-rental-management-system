"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { lastDayOfMonth } from "@/lib/dates";

export async function recordUtilityReading(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.UTILITIES_WRITE);

  const roomId = String(formData.get("roomId") ?? "");
  const month = String(formData.get("month") ?? "");
  const waterPrevious = Number(formData.get("waterPrevious") ?? 0);
  const waterCurrent = Number(formData.get("waterCurrent") ?? 0);
  const electricityPrevious = Number(formData.get("electricityPrevious") ?? 0);
  const electricityCurrent = Number(formData.get("electricityCurrent") ?? 0);

  if (!roomId || !month) throw new Error("Room and month are required.");
  if (waterCurrent < waterPrevious || electricityCurrent < electricityPrevious) {
    throw new Error("Current readings cannot be lower than previous readings.");
  }

  const room = await prisma.room.findFirstOrThrow({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });

  const [waterRateRow, electricityRateRow] = await Promise.all([
    prisma.utilityRate.findFirst({
      where: { type: "WATER", workspaceId: user.workspaceId },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.utilityRate.findFirst({
      where: { type: "ELECTRICITY", workspaceId: user.workspaceId },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  const waterRate = waterRateRow?.pricePerUnit ?? 0;
  const electricityRate = electricityRateRow?.pricePerUnit ?? 0;

  const waterUsage = waterCurrent - waterPrevious;
  const electricityUsage = electricityCurrent - electricityPrevious;
  const waterCost = waterUsage * waterRate;
  const electricityCost = electricityUsage * electricityRate;
  const totalCost = waterCost + electricityCost;

  const reading = await prisma.utilityReading.upsert({
    where: { roomId_month: { roomId, month } },
    create: {
      roomId,
      month,
      waterPrevious,
      waterCurrent,
      waterUsage,
      waterRate,
      waterCost,
      electricityPrevious,
      electricityCurrent,
      electricityUsage,
      electricityRate,
      electricityCost,
      totalCost,
    },
    update: {
      waterPrevious,
      waterCurrent,
      waterUsage,
      waterRate,
      waterCost,
      electricityPrevious,
      electricityCurrent,
      electricityUsage,
      electricityRate,
      electricityCost,
      totalCost,
    },
  });

  // Rent + utility cost are combined into a single payment per room/month.
  await prisma.payment.upsert({
    where: { roomId_month: { roomId, month } },
    create: {
      roomId,
      month,
      rentalFee: room.rentalFee,
      utilityAmount: totalCost,
      totalAmount: room.rentalFee + totalCost,
      utilityReadingId: reading.id,
      dueDate: lastDayOfMonth(month),
    },
    update: {
      utilityAmount: totalCost,
      totalAmount: room.rentalFee + totalCost,
      utilityReadingId: reading.id,
    },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "UTILITY",
    entityId: reading.id,
    roomId,
    action: "UTILITY_RECORDED",
    description: `Utility reading for ${month} recorded (water: ${waterUsage} units, electricity: ${electricityUsage} units, total: ${totalCost.toFixed(2)} USD).`,
    performedById: user.id,
  });

  revalidatePath("/utilities");
  revalidatePath("/payments");
  revalidatePath(`/rooms/${roomId}`);
  redirect("/utilities");
}
