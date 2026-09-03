"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { Loader2, ScanLine } from "lucide-react";

/**
 * The scanner (and its camera library) is only downloaded on first use, so the
 * click gets its own loading state: the overlay appears immediately while that
 * chunk is still in flight.
 */
const QrScannerPanel = dynamic(() => import("./QrScannerPanel").then((m) => m.QrScannerPanel), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      aria-label="Loading scanner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden="true" />
    </div>
  ),
});

/** Opens a camera scanner that jumps straight to a scanned room's utility reading form. */
export function QrScanButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="secondary" icon={ScanLine} onClick={() => setOpen(true)}>
        Scan QR
      </Button>
      {open ? <QrScannerPanel onClose={() => setOpen(false)} /> : null}
    </>
  );
}
