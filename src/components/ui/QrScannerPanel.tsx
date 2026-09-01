"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Full-screen camera scanner for room utility-reading QR codes. Loaded only in
 * the browser (via a dynamic import with ssr:false) since html5-qrcode needs
 * `navigator`/`document` and can't run during server rendering.
 */
export function QrScannerPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const containerId = "qr-scanner-reader";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- html5-qrcode ships no usable types for this instance shape here
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    function handleScan(decodedText: string) {
      try {
        const url = new URL(decodedText, window.location.origin);
        if (url.origin !== window.location.origin) {
          setError("This QR code doesn't belong to RentalHRM.");
          return;
        }
        router.push(url.pathname + url.search);
        onClose();
      } catch {
        setError("That doesn't look like a valid QR code.");
      }
    }

    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (cancelled) return;
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      scanner
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          (decodedText: string) => {
            scanner
              .stop()
              .catch(() => {})
              .finally(() => handleScan(decodedText));
          },
          () => {
            // Per-frame "no QR code found" callback — expected constantly while scanning, ignore.
          }
        )
        .catch(() => {
          setError("Could not access the camera. Check permissions and try again.");
        });
    });

    return () => {
      cancelled = true;
      const scanner = scannerRef.current;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount only
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Scan room QR code</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close scanner"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div id={containerId} className="overflow-hidden rounded-md bg-slate-900" />
        {error ? (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        ) : (
          <p className="mt-3 text-xs text-slate-500">Point your camera at a room&apos;s utility reading QR code.</p>
        )}
      </div>
    </div>
  );
}
