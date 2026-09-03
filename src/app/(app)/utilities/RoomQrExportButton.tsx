"use client";

import { useState } from "react";
import { AlertTriangle, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { prepareRoomQrSheet } from "@/app/(app)/utilities/qr-actions";

/**
 * Exports an A4 sheet of utility-reading QR codes for exactly the rooms the
 * Utilities page is currently filtered to, so a manager can print them and post
 * one in each room.
 */
export function RoomQrExportButton({ apartmentId, roomId }: { apartmentId?: string; roomId?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setLoading(true);
    // Open the tab synchronously, before the first `await` — otherwise the
    // browser no longer treats it as a direct result of the click and blocks
    // the popup. We navigate this already-open tab once the PDF is ready.
    const newWindow = window.open("", "_blank");
    try {
      const result = await prepareRoomQrSheet({ apartmentId, roomId });
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
        // Pop-ups blocked — fall back to downloading the file instead of failing.
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        link.click();
      }
      // The new tab keeps its own reference to the blob; free ours after a beat.
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="secondary" icon={Printer} loading={loading} disabled={loading} onClick={handleExport}>
        Export QR codes
      </Button>
      {error ? (
        <p className="flex items-center gap-1 text-xs text-red-600">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
