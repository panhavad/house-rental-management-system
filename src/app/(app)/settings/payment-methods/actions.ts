"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { savePaymentMethodQrImage, deletePaymentMethodQrImage } from "@/lib/payment-method-files";

function parseFields(formData: FormData) {
  const label = String(formData.get("label") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim() || null;
  const accountName = String(formData.get("accountName") ?? "").trim() || null;
  const accountNumber = String(formData.get("accountNumber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!label) throw new Error("A name for this payment method is required.");

  return { label, bankName, accountName, accountNumber, notes };
}

export async function createPaymentMethod(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.PAYMENT_METHODS_WRITE);
  const fields = parseFields(formData);

  const qrFile = formData.get("qrImage");
  const qrImageUrl = qrFile instanceof File && qrFile.size > 0 ? await savePaymentMethodQrImage(qrFile) : null;

  const method = await prisma.paymentMethod.create({
    data: { workspaceId: user.workspaceId, ...fields, qrImageUrl },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "PAYMENT_METHOD",
    entityId: method.id,
    action: "PAYMENT_METHOD_CREATED",
    description: `Payment method "${method.label}" was added.`,
    performedById: user.id,
  });

  revalidatePath("/settings/payment-methods");
}

export async function updatePaymentMethod(methodId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.PAYMENT_METHODS_WRITE);
  const existing = await prisma.paymentMethod.findFirst({
    where: { id: methodId, workspaceId: user.workspaceId },
  });
  if (!existing) throw new Error("Payment method not found.");

  const fields = parseFields(formData);
  const removeQr = formData.get("removeQr") === "on";
  const qrFile = formData.get("qrImage");

  let qrImageUrl = existing.qrImageUrl;
  if (qrFile instanceof File && qrFile.size > 0) {
    await deletePaymentMethodQrImage(existing.qrImageUrl);
    qrImageUrl = await savePaymentMethodQrImage(qrFile);
  } else if (removeQr && existing.qrImageUrl) {
    await deletePaymentMethodQrImage(existing.qrImageUrl);
    qrImageUrl = null;
  }

  const method = await prisma.paymentMethod.update({
    where: { id: methodId },
    data: { ...fields, qrImageUrl },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "PAYMENT_METHOD",
    entityId: method.id,
    action: "PAYMENT_METHOD_UPDATED",
    description: `Payment method "${method.label}" was updated.`,
    performedById: user.id,
  });

  revalidatePath("/settings/payment-methods");
}

export async function deletePaymentMethod(methodId: string) {
  const user = await requirePermission(PERMISSIONS.PAYMENT_METHODS_WRITE);
  const existing = await prisma.paymentMethod.findFirst({
    where: { id: methodId, workspaceId: user.workspaceId },
  });
  if (!existing) throw new Error("Payment method not found.");

  await deletePaymentMethodQrImage(existing.qrImageUrl);
  await prisma.paymentMethod.delete({ where: { id: methodId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "PAYMENT_METHOD",
    entityId: existing.id,
    action: "PAYMENT_METHOD_DELETED",
    description: `Payment method "${existing.label}" was removed.`,
    performedById: user.id,
  });

  revalidatePath("/settings/payment-methods");
}
