import QRCode from "qrcode";
import { headers } from "next/headers";

/**
 * Builds an absolute URL for the current request's host, so QR codes work when
 * scanned from a phone on the same network (not just http://localhost).
 */
export async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Deep link that opens the "record a utility reading" form pre-filled for a room. */
export async function roomUtilityReadingUrl(roomId: string): Promise<string> {
  const origin = await getRequestOrigin();
  return `${origin}/utilities/new?roomId=${roomId}`;
}

/** Renders a QR code encoding the given text as a PNG data URL, ready for an <img src>. */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220 });
}
