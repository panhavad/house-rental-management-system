import { rgb } from "pdf-lib";
import { formatMoney, type AppSettings } from "@/lib/currency";
import {
  MARGIN,
  CONTENT_WIDTH,
  MUTED_COLOR,
  createPdfCursor,
  ensureSpace,
  drawParagraph,
  drawSectionHeading,
  drawField,
  formatDate,
  drawFooters,
  type Cursor,
} from "@/lib/pdf-layout";

const PAID_COLOR = rgb(0.09, 0.45, 0.27);
const OVERDUE_COLOR = rgb(0.75, 0.2, 0.15);
const PENDING_COLOR = rgb(0.7, 0.5, 0.05);

export type InvoicePaymentMethod = {
  label: string;
  bankName: string | null;
  accountName: string | null;
  accountNumber: string | null;
  notes: string | null;
  /** Pre-loaded PNG bytes for the method's QR code, if it has one (payment-method-files.ts always normalizes uploads to PNG). */
  qrImageBytes: Uint8Array | null;
};

export type InvoicePdfData = {
  payment: {
    id: string;
    month: string;
    rentalFee: number;
    utilityAmount: number;
    totalAmount: number;
    status: "PENDING" | "PAID" | "OVERDUE";
    dueDate: Date | null;
    paidAt: Date | null;
    paidAmount: number | null;
    method: string | null;
    notes: string | null;
  };
  room: { name: string; type: string };
  apartment: { name: string; address: string | null };
  /** The tenant whose lease covers this payment's billing month, if one could be found. */
  tenantName: string | null;
  workspaceName: string;
  settings: AppSettings;
  paymentMethods: InvoicePaymentMethod[];
  generatedAt: Date;
};

const STATUS_LABELS: Record<InvoicePdfData["payment"]["status"], string> = {
  PAID: "PAID",
  PENDING: "PENDING",
  OVERDUE: "OVERDUE",
};

const STATUS_COLORS: Record<InvoicePdfData["payment"]["status"], ReturnType<typeof rgb>> = {
  PAID: PAID_COLOR,
  PENDING: PENDING_COLOR,
  OVERDUE: OVERDUE_COLOR,
};

/** Draws two `Label: value` fields side by side in independent columns, syncing the cursor to whichever column ends up taller. */
function drawTwoColumnFields(cursor: Cursor, left: [string, string][], right: [string, string][]) {
  const columnWidth = (CONTENT_WIDTH - 24) / 2;
  const startY = cursor.y;

  for (const [label, value] of left) {
    drawField(cursor, label, value, { x: MARGIN, width: columnWidth });
  }
  const leftEndY = cursor.y;

  cursor.y = startY;
  for (const [label, value] of right) {
    drawField(cursor, label, value, { x: MARGIN + columnWidth + 24, width: columnWidth });
  }
  const rightEndY = cursor.y;

  cursor.y = Math.min(leftEndY, rightEndY);
}

/**
 * Builds a print-ready payment invoice/receipt PDF for one rent+utility
 * payment — bill-to/period details, itemized rent & utility charges, current
 * status, and the workspace's configured payment methods (bank details / QR
 * codes) so the tenant knows exactly how to pay. Returned as raw bytes ready
 * to write to disk or stream to the browser.
 */
export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const cursor = await createPdfCursor();
  const { payment, settings } = data;

  const title = payment.status === "PAID" ? "PAYMENT RECEIPT" : "PAYMENT INVOICE";
  drawParagraph(cursor, title, { size: 18, bold: true, center: true, gapAfter: 4 });
  drawParagraph(cursor, data.workspaceName, { size: 11, center: true, color: MUTED_COLOR, gapAfter: 2 });
  drawParagraph(cursor, `Generated on ${formatDate(data.generatedAt)}`, {
    size: 9,
    center: true,
    color: MUTED_COLOR,
    gapAfter: 10,
  });
  drawParagraph(cursor, STATUS_LABELS[payment.status], {
    size: 12,
    bold: true,
    center: true,
    color: STATUS_COLORS[payment.status],
    gapAfter: 14,
  });

  drawTwoColumnFields(
    cursor,
    [
      ["Billed to", data.tenantName ?? "—"],
      ["Room", `${data.room.name} (${data.room.type})`],
      ["Apartment", data.apartment.address ? `${data.apartment.name}, ${data.apartment.address}` : data.apartment.name],
    ],
    [
      ["Invoice #", payment.id],
      ["Billing period", payment.month],
      ["Due date", payment.dueDate ? formatDate(payment.dueDate) : "—"],
    ]
  );
  cursor.y -= 10;

  drawSectionHeading(cursor, "Charges");
  drawField(cursor, "Rent", formatMoney(payment.rentalFee, settings));
  drawField(cursor, "Utilities (water & electricity)", formatMoney(payment.utilityAmount, settings));
  cursor.y -= 4;
  drawParagraph(cursor, `Total due: ${formatMoney(payment.totalAmount, settings)}`, { size: 13, bold: true, gapAfter: 8 });

  if (payment.status === "PAID") {
    drawField(cursor, "Paid on", payment.paidAt ? formatDate(payment.paidAt) : "—");
    if (payment.paidAmount != null) drawField(cursor, "Amount paid", formatMoney(payment.paidAmount, settings));
    if (payment.method) drawField(cursor, "Paid via", payment.method);
  }
  if (payment.notes) {
    drawField(cursor, "Notes", payment.notes);
  }

  if (data.paymentMethods.length > 0) {
    drawSectionHeading(cursor, "Ways to Pay");
    for (const method of data.paymentMethods) {
      ensureSpace(cursor, 26);
      drawParagraph(cursor, method.label, { size: 11, bold: true, gapAfter: 4 });
      if (method.bankName) drawField(cursor, "Bank / provider", method.bankName);
      if (method.accountName) drawField(cursor, "Account holder", method.accountName);
      if (method.accountNumber) drawField(cursor, "Account / phone number", method.accountNumber);
      if (method.notes) drawField(cursor, "Notes", method.notes);

      if (method.qrImageBytes) {
        const qrSize = 90;
        ensureSpace(cursor, qrSize + 10);
        const image = await cursor.doc.embedPng(method.qrImageBytes);
        cursor.page.drawImage(image, { x: MARGIN, y: cursor.y - qrSize, width: qrSize, height: qrSize });
        cursor.page.drawText("Scan to pay", {
          x: MARGIN + qrSize + 10,
          y: cursor.y - qrSize / 2 - 5,
          size: 9,
          font: cursor.font,
          color: MUTED_COLOR,
        });
        cursor.y -= qrSize + 10;
      }
      cursor.y -= 8;
    }
  }

  drawFooters(cursor, `Invoice ${payment.id} · Generated ${formatDate(data.generatedAt)}`);

  return cursor.doc.save();
}
