"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/Button";
import { ScanLine } from "lucide-react";

const QrScannerPanel = dynamic(() => import("./QrScannerPanel").then((m) => m.QrScannerPanel), { ssr: false });

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
