import { writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { deleteUpload, ensureUploadDir, uploadUrl } from "@/lib/uploads";

const UPLOAD_FOLDER = "contracts";
const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

// Thumbnails are kept intentionally small and low quality: contracts can have
// several attachments, and the goal is a quick visual hint, not a full preview.
const THUMBNAIL_SIZE = 120;
const THUMBNAIL_QUALITY = 40;

export type SavedContractDocument = {
  url: string;
  thumbnailUrl: string | null;
  fileType: "pdf" | "image";
};

function uniqueBaseName(contractId: string): string {
  return `${contractId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Saves one uploaded contract document (PDF or image) and returns its stored URLs. */
export async function saveContractDocument(file: File, contractId: string): Promise<SavedContractDocument> {
  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    throw new Error("Only PDF, JPG, PNG or WEBP files are allowed.");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("File is too large (max 10MB).");
  }

  const uploadDir = await ensureUploadDir(UPLOAD_FOLDER);

  const base = uniqueBaseName(contractId);
  const filename = `${base}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const isImage = extension !== "pdf";
  let thumbnailUrl: string | null = null;

  if (isImage) {
    const thumbFilename = `${base}-thumb.jpg`;
    await sharp(buffer)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(path.join(uploadDir, thumbFilename));
    thumbnailUrl = uploadUrl(UPLOAD_FOLDER, thumbFilename);
  }

  return {
    url: uploadUrl(UPLOAD_FOLDER, filename),
    thumbnailUrl,
    fileType: isImage ? "image" : "pdf",
  };
}

/** Saves multiple uploaded contract documents, skipping any empty file inputs. */
export async function saveContractDocuments(
  files: File[],
  contractId: string
): Promise<SavedContractDocument[]> {
  const saved: SavedContractDocument[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    saved.push(await saveContractDocument(file, contractId));
  }
  return saved;
}

/** Saves a server-generated PDF (e.g. the auto-drafted rental agreement) alongside any uploaded documents. */
export async function saveGeneratedContractPdf(bytes: Uint8Array, contractId: string): Promise<SavedContractDocument> {
  const uploadDir = await ensureUploadDir(UPLOAD_FOLDER);

  const filename = `${uniqueBaseName(contractId)}-agreement.pdf`;
  await writeFile(path.join(uploadDir, filename), bytes);

  return {
    url: uploadUrl(UPLOAD_FOLDER, filename),
    thumbnailUrl: null,
    fileType: "pdf",
  };
}

/** Best-effort removal of a previously stored contract document and its thumbnail. */
export async function deleteContractDocumentFiles(doc: {
  url?: string | null;
  thumbnailUrl?: string | null;
}): Promise<void> {
  for (const url of [doc.url, doc.thumbnailUrl]) {
    await deleteUpload(url);
  }
}
