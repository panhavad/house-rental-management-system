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
export function buildRoomUtilityReadingUrl(origin: string, roomId: string): string {
  return `${origin}/utilities/new?roomId=${roomId}`;
}

/** Same as `buildRoomUtilityReadingUrl`, resolving the origin from the current request. */
export async function roomUtilityReadingUrl(roomId: string): Promise<string> {
  return buildRoomUtilityReadingUrl(await getRequestOrigin(), roomId);
}

/** Renders a QR code encoding the given text as a PNG data URL, ready for an <img src>. */
export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 220 });
}

/**
 * Renders a QR code as raw PNG bytes for embedding in generated PDFs. Rendered
 * larger than it is printed so it stays crisp on paper, and with a higher error
 * correction level because printed codes get scanned in poor lighting and can
 * pick up scuffs on the wall.
 */
export async function generateQrPngBytes(text: string): Promise<Uint8Array> {
  const buffer = await QRCode.toBuffer(text, { margin: 1, width: 600, errorCorrectionLevel: "M" });
  return new Uint8Array(buffer);
}
