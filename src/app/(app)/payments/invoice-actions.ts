"use server";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { getAppSettings } from "@/lib/currency";
import { getWorkspacePaymentMethods } from "@/lib/payment-methods";
import { generateInvoicePdf, type InvoicePaymentMethod } from "@/lib/invoice-pdf";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/dates";
import { readUploadBytes } from "@/lib/uploads";

/** Plain, JSON-serializable view of an invoice — used both to render the on-screen "share as image" preview and as the source for the PDF. */
export type InvoiceViewData = {
  paymentId: string;
  month: string;
  rentalFee: number;
  utilityAmount: number;
  totalAmount: number;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string | null;
  paidAt: string | null;
  paidAmount: number | null;
  method: string | null;
  notes: string | null;
  roomName: string;
  roomType: string;
  apartmentName: string;
  apartmentAddress: string | null;
  tenantName: string | null;
  workspaceName: string;
  currency: string;
  exchangeRate: number;
  paymentMethods: {
    label: string;
    bankName: string | null;
    accountName: string | null;
    accountNumber: string | null;
    notes: string | null;
    qrImageUrl: string | null;
  }[];
  generatedAt: string;
};

/** Finds the tenant whose lease covers a payment's billing month, if any (a payment isn't reliably linked to a specific contract otherwise). */
async function findTenantNameForPayment(roomId: string, month: string): Promise<string | null> {
  const contract = await prisma.contract.findFirst({
    where: {
      roomId,
      startDate: { lte: lastDayOfMonth(month) },
      endDate: { gte: firstDayOfMonth(month) },
    },
    orderBy: { startDate: "desc" },
  });
  return contract?.tenantName ?? null;
}

/**
 * Gathers everything needed to display/generate an invoice for one payment,
 * and renders the PDF right away — a single round trip covers both the
 * "download/print PDF" and "share as image" actions on the Payments page.
 */
export async function prepareInvoice(paymentId: string): Promise<{ data: InvoiceViewData; pdfBase64: string } | { error: string }> {
  const user = await requireWorkspaceUser();

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, room: { apartment: { workspaceId: user.workspaceId } } },
    include: { room: { include: { apartment: true } } },
  });
  if (!payment) return { error: "Payment not found." };

  try {
    const [tenantName, settings, methods] = await Promise.all([
      findTenantNameForPayment(payment.roomId, payment.month),
      getAppSettings(user.workspaceId),
      getWorkspacePaymentMethods(user.workspaceId),
    ]);

    const methodsWithQr: (InvoicePaymentMethod & { qrImageUrl: string | null })[] = await Promise.all(
      methods.map(async (method) => {
        let qrImageBytes: Uint8Array | null = null;
        if (method.qrImageUrl) {
          try {
            qrImageBytes = await readUploadBytes(method.qrImageUrl);
          } catch {
            qrImageBytes = null; // File missing on disk — skip embedding rather than fail the whole invoice.
          }
        }
        return {
          label: method.label,
          bankName: method.bankName,
          accountName: method.accountName,
          accountNumber: method.accountNumber,
          notes: method.notes,
          qrImageBytes,
          qrImageUrl: method.qrImageUrl,
        };
      })
    );

    const generatedAt = new Date();

    const pdfBytes = await generateInvoicePdf({
      payment: {
        id: payment.id,
        month: payment.month,
        rentalFee: payment.rentalFee,
        utilityAmount: payment.utilityAmount,
        totalAmount: payment.totalAmount,
        status: payment.status,
        dueDate: payment.dueDate,
        paidAt: payment.paidAt,
        paidAmount: payment.paidAmount,
        method: payment.method,
        notes: payment.notes,
      },
      room: { name: payment.room.name, type: payment.room.type },
      apartment: { name: payment.room.apartment.name, address: payment.room.apartment.address },
      tenantName,
      workspaceName: user.workspaceName ?? "RentalHRM",
      settings,
      paymentMethods: methodsWithQr,
      generatedAt,
    });

    const data: InvoiceViewData = {
      paymentId: payment.id,
      month: payment.month,
      rentalFee: payment.rentalFee,
      utilityAmount: payment.utilityAmount,
      totalAmount: payment.totalAmount,
      status: payment.status,
      dueDate: payment.dueDate?.toISOString() ?? null,
      paidAt: payment.paidAt?.toISOString() ?? null,
      paidAmount: payment.paidAmount,
      method: payment.method,
      notes: payment.notes,
      roomName: payment.room.name,
      roomType: payment.room.type,
      apartmentName: payment.room.apartment.name,
      apartmentAddress: payment.room.apartment.address,
      tenantName,
      workspaceName: user.workspaceName ?? "RentalHRM",
      currency: settings.currency,
      exchangeRate: settings.exchangeRate,
      paymentMethods: methodsWithQr.map((m) => ({
        label: m.label,
        bankName: m.bankName,
        accountName: m.accountName,
        accountNumber: m.accountNumber,
        notes: m.notes,
        qrImageUrl: m.qrImageUrl,
      })),
      generatedAt: generatedAt.toISOString(),
    };

    return { data, pdfBase64: Buffer.from(pdfBytes).toString("base64") };
  } catch (error) {
    console.error("Failed to generate invoice PDF:", error);
    return { error: "Couldn't generate the invoice. Please try again." };
  }
}
