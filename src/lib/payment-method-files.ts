import path from "path";
import sharp from "sharp";
import { deleteUpload, ensureUploadDir, uploadUrl } from "@/lib/uploads";

const UPLOAD_FOLDER = "payment-methods";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
// QR codes only need to be legible when scanned on a phone screen — normalizing
// to a fixed square PNG keeps invoice layout predictable regardless of what the
// admin originally uploaded (a photo, a screenshot, any aspect ratio, ...).
const QR_SIZE = 400;

/** Saves an uploaded QR/payment code image, normalized to a square PNG, and returns its public URL. */
export async function savePaymentMethodQrImage(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Only JPG, PNG or WEBP images are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Image is too large (max 5MB).");
  }

  const uploadDir = await ensureUploadDir(UPLOAD_FOLDER);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
  await sharp(buffer)
    .resize(QR_SIZE, QR_SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(uploadDir, filename));

  return uploadUrl(UPLOAD_FOLDER, filename);
}

/** Best-effort removal of a previously stored QR image. */
export async function deletePaymentMethodQrImage(qrImageUrl: string | null | undefined): Promise<void> {
  await deleteUpload(qrImageUrl);
}
