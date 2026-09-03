"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { currentMonth, lastDayOfMonth } from "@/lib/dates";
import { contractFixedUtilityFees, fixedUtilityTotal } from "@/lib/utility-billing";

export async function generateMissingInvoices(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.PAYMENTS_WRITE);

  const month = String(formData.get("month") ?? "").trim() || currentMonth();

  const occupiedRooms = await prisma.room.findMany({
    where: { status: "OCCUPIED", apartment: { workspaceId: user.workspaceId } },
    include: {
      payments: { where: { month } },
      contracts: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" }, take: 1 },
    },
  });

  const roomsNeedingInvoice = occupiedRooms.filter((room) => room.payments.length === 0);

  for (const room of roomsNeedingInvoice) {
    // Fixed/pre-paid utilities are known up front, so they can be billed
    // without a meter reading; metered utilities are added later, when the
    // reading for the month is recorded.
    const utilityAmount = fixedUtilityTotal(contractFixedUtilityFees(room.contracts[0]));
    const payment = await prisma.payment.create({
      data: {
        roomId: room.id,
        month,
        rentalFee: room.rentalFee,
        utilityAmount,
        totalAmount: room.rentalFee + utilityAmount,
        dueDate: lastDayOfMonth(month),
      },
    });
    await logActivity({
      workspaceId: user.workspaceId,
      entityType: "PAYMENT",
      entityId: payment.id,
      roomId: room.id,
      action: "PAYMENT_GENERATED",
      description: `Payment of ${payment.totalAmount.toFixed(2)} USD generated for ${month}.`,
      performedById: user.id,
    });
  }

  revalidatePath("/payments");
}

export async function markPaid(paymentId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.PAYMENTS_WRITE);
  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, room: { apartment: { workspaceId: user.workspaceId } } },
  });
  if (!existing) throw new Error("Payment not found.");

  const paidAmount = Number(formData.get("paidAmount") ?? 0);
  const method = String(formData.get("method") ?? "").trim() || null;

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "PAID", paidAt: new Date(), paidAmount, method },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "PAYMENT",
    entityId: payment.id,
    roomId: payment.roomId,
    action: "PAYMENT_PAID",
    description: `Payment for ${payment.month} marked as PAID.`,
    performedById: user.id,
  });

  revalidatePath("/payments");
}

export async function markOverdue(paymentId: string) {
  const user = await requirePermission(PERMISSIONS.PAYMENTS_WRITE);
  const existing = await prisma.payment.findFirst({
    where: { id: paymentId, room: { apartment: { workspaceId: user.workspaceId } } },
  });
  if (!existing) throw new Error("Payment not found.");

  const payment = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "OVERDUE" },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "PAYMENT",
    entityId: payment.id,
    roomId: payment.roomId,
    action: "PAYMENT_OVERDUE",
    description: `Payment for ${payment.month} marked as OVERDUE.`,
    performedById: user.id,
  });

  revalidatePath("/payments");
}
