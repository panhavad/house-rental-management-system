"use client";

import { useState } from "react";
import { FileText, Share2, AlertTriangle, Loader2 } from "lucide-react";
import { prepareInvoice, type InvoiceViewData } from "@/app/(app)/payments/invoice-actions";
import { formatMoney, type AppSettings } from "@/lib/currency-format";
import { createTranslator } from "@/lib/language-shared";

/** Builds the printable invoice as a plain, inline-styled DOM tree (not Tailwind classes) so html2canvas renders it reliably regardless of the app's own stylesheet. */
function buildInvoiceElement(data: InvoiceViewData): HTMLDivElement {
  const settings: AppSettings = { currency: data.currency as AppSettings["currency"], exchangeRate: data.exchangeRate };
  const t = createTranslator(data.locale, data.translations);
  const statusColors: Record<InvoiceViewData["status"], string> = {
    PAID: "#0f7a45",
    PENDING: "#b3810d",
    OVERDUE: "#bf3327",
  };

  const root = document.createElement("div");
  Object.assign(root.style, {
    width: "480px",
    padding: "28px",
    backgroundColor: "#ffffff",
    color: "#1e222b",
    fontFamily: "Arial, Helvetica, sans-serif",
    boxSizing: "border-box",
  });

  function row(label: string, value: string) {
    const wrap = document.createElement("div");
    Object.assign(wrap.style, { display: "flex", justifyContent: "space-between", gap: "12px", fontSize: "13px", padding: "3px 0" });
    const l = document.createElement("span");
    l.textContent = label;
    Object.assign(l.style, { color: "#6b7280" });
    const v = document.createElement("span");
    v.textContent = value;
    Object.assign(v.style, { color: "#1e222b", fontWeight: "500", textAlign: "right" });
    wrap.append(l, v);
    return wrap;
  }

  function heading(text: string) {
    const h = document.createElement("div");
    h.textContent = text;
    Object.assign(h.style, {
      fontSize: "13px",
      fontWeight: "700",
      marginTop: "16px",
      marginBottom: "6px",
      paddingBottom: "4px",
      borderBottom: "1px solid #e2e8f0",
    });
    return h;
  }

  const header = document.createElement("div");
  Object.assign(header.style, { textAlign: "center", marginBottom: "16px" });
  const title = document.createElement("div");
  title.textContent = t(data.status === "PAID" ? "PAYMENT RECEIPT" : "PAYMENT INVOICE");
  Object.assign(title.style, { fontSize: "18px", fontWeight: "700" });
  const workspace = document.createElement("div");
  workspace.textContent = data.workspaceName;
  Object.assign(workspace.style, { fontSize: "12px", color: "#6b7280", marginTop: "2px" });
  const status = document.createElement("div");
  status.textContent = t(data.status);
  Object.assign(status.style, { fontSize: "13px", fontWeight: "700", color: statusColors[data.status], marginTop: "8px" });
  header.append(title, workspace, status);
  root.appendChild(header);

  root.appendChild(row(t("Billed to"), data.tenantName ?? "—"));
  root.appendChild(row(t("Room"), `${data.roomName} (${data.roomType})`));
  root.appendChild(row(t("Apartment"), data.apartmentAddress ? `${data.apartmentName}, ${data.apartmentAddress}` : data.apartmentName));
  root.appendChild(row(t("Invoice #"), data.paymentId));
  root.appendChild(row(t("Billing period"), data.month));
  root.appendChild(row(t("Due date"), data.dueDate ? new Date(data.dueDate).toLocaleDateString(data.locale === "km" ? "km-KH" : "en-US") : "—"));

  root.appendChild(heading(t("Charges")));
  root.appendChild(row(t("Rent"), formatMoney(data.rentalFee, settings)));
  root.appendChild(row(t("Utilities (water & electricity)"), formatMoney(data.utilityAmount, settings)));
  const total = document.createElement("div");
  Object.assign(total.style, { display: "flex", justifyContent: "space-between", marginTop: "8px", fontSize: "15px", fontWeight: "700" });
  const totalLabel = document.createElement("span");
  totalLabel.textContent = t("Total due: {amount}", { amount: "" }).replace(/[:៖]\s*$/, "");
  const totalValue = document.createElement("span");
  totalValue.textContent = formatMoney(data.totalAmount, settings);
  total.append(totalLabel, totalValue);
  root.appendChild(total);

  if (data.status === "PAID") {
    root.appendChild(row(t("Paid on"), data.paidAt ? new Date(data.paidAt).toLocaleDateString(data.locale === "km" ? "km-KH" : "en-US") : "—"));
    if (data.paidAmount != null) root.appendChild(row(t("Amount paid"), formatMoney(data.paidAmount, settings)));
    if (data.method) root.appendChild(row(t("Paid via"), data.method));
  }
  if (data.notes) root.appendChild(row(t("Notes"), data.notes));

  if (data.paymentMethods.length > 0) {
    root.appendChild(heading(t("Ways to Pay")));
    for (const method of data.paymentMethods) {
      const block = document.createElement("div");
      Object.assign(block.style, { display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" });

      const details = document.createElement("div");
      Object.assign(details.style, { flex: "1" });
      const label = document.createElement("div");
      label.textContent = method.label;
      Object.assign(label.style, { fontSize: "13px", fontWeight: "700", marginBottom: "2px" });
      details.appendChild(label);
      if (method.bankName) details.appendChild(row(t("Bank / provider"), method.bankName));
      if (method.accountName) details.appendChild(row(t("Account holder"), method.accountName));
      if (method.accountNumber) details.appendChild(row(t("Account / phone number"), method.accountNumber));
      if (method.notes) details.appendChild(row(t("Notes"), method.notes));

      block.appendChild(details);
      if (method.qrImageUrl) {
        const img = document.createElement("img");
        img.src = method.qrImageUrl;
        Object.assign(img.style, { width: "72px", height: "72px", objectFit: "contain", border: "1px solid #e2e8f0", borderRadius: "4px" });
        block.appendChild(img);
      }
      root.appendChild(block);
    }
  }

  const footer = document.createElement("div");
  footer.textContent = `Generated via RentalHRM on ${new Date(data.generatedAt).toLocaleDateString()}`;
  Object.assign(footer.style, { marginTop: "16px", paddingTop: "10px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#9ca3af", textAlign: "center" });
  root.appendChild(footer);

  return root;
}

async function waitForImages(element: HTMLElement): Promise<void> {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

export function InvoiceButtons({ paymentId, roomLabel, month }: { paymentId: string; roomLabel: string; month: string }) {
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleOpenPdf() {
    setError(null);
    setIsLoadingPdf(true);
    // Open the tab synchronously, before the first `await` — otherwise the
    // browser no longer sees this as a direct result of the click and blocks
    // the popup. We navigate this already-open tab to the PDF once it's ready.
    const newWindow = window.open("", "_blank");
    try {
      const result = await prepareInvoice(paymentId);
      if ("error" in result) {
        setError(result.error);
        newWindow?.close();
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (newWindow) {
        newWindow.location.href = url;
      } else {
        setError("Your browser blocked the new tab. Please allow pop-ups for this site and try again.");
      }
      // The new tab keeps its own reference to the blob; free ours after a beat.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setIsLoadingPdf(false);
    }
  }

  async function handleShareAsImage() {
    setError(null);
    setIsSharing(true);
    let element: HTMLDivElement | null = null;
    try {
      const result = await prepareInvoice(paymentId);
      if ("error" in result) {
        setError(result.error);
        return;
      }

      element = buildInvoiceElement(result.data);
      Object.assign(element.style, { position: "fixed", top: "-10000px", left: "0", zIndex: "-1" });
      document.body.appendChild(element);
      await waitForImages(element);

      const { default: html2canvas } = await import("html2canvas-pro");
      const canvas = await html2canvas(element, { backgroundColor: "#ffffff", scale: 2, useCORS: true });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) {
        setError("Couldn't render the invoice image. Please try again.");
        return;
      }

      const filename = `invoice-${roomLabel}-${month}.png`.replace(/\s+/g, "-");
      const file = new File([blob], filename, { type: "image/png" });

      const canShareFiles =
        typeof navigator !== "undefined" && "canShare" in navigator && navigator.canShare?.({ files: [file] });

      if (canShareFiles) {
        try {
          await navigator.share({ files: [file], title: "Payment invoice", text: `Invoice for ${roomLabel} — ${month}` });
        } catch (shareError) {
          // The user closing the native share sheet throws AbortError — not a real failure.
          if (shareError instanceof Error && shareError.name !== "AbortError") {
            setError("Couldn't share the image. It was downloaded instead.");
            downloadBlob(blob, filename);
          }
        }
      } else {
        downloadBlob(blob, filename);
      }
    } finally {
      if (element) document.body.removeChild(element);
      setIsSharing(false);
    }
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenPdf}
          disabled={isLoadingPdf}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isLoadingPdf ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          Invoice
        </button>
        <button
          type="button"
          onClick={handleShareAsImage}
          disabled={isSharing}
          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60"
        >
          {isSharing ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          Share as image
        </button>
      </div>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
