"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { lastDayOfMonth } from "@/lib/dates";
import { contractFixedUtilityFees, utilityCharge, FIXED_UTILITY_SELECT } from "@/lib/utility-billing";

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

  const [waterRateRow, electricityRateRow, activeContract] = await Promise.all([
    prisma.utilityRate.findFirst({
      where: { type: "WATER", workspaceId: user.workspaceId },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.utilityRate.findFirst({
      where: { type: "ELECTRICITY", workspaceId: user.workspaceId },
      orderBy: { effectiveFrom: "desc" },
    }),
    // A fixed/pre-paid utility is charged at its agreed flat price; the meter
    // reading is still recorded, it just doesn't drive the amount billed.
    prisma.contract.findFirst({
      where: { roomId, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
      select: FIXED_UTILITY_SELECT,
    }),
  ]);
  const fixedFees = contractFixedUtilityFees(activeContract);

  const waterUsage = waterCurrent - waterPrevious;
  const electricityUsage = electricityCurrent - electricityPrevious;
  const { rate: waterRate, cost: waterCost } = utilityCharge(
    waterUsage,
    waterRateRow?.pricePerUnit ?? 0,
    fixedFees.water
  );
  const { rate: electricityRate, cost: electricityCost } = utilityCharge(
    electricityUsage,
    electricityRateRow?.pricePerUnit ?? 0,
    fixedFees.electricity
  );
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
