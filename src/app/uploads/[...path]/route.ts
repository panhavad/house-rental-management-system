import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveUploadFile, safeRelativeUploadPath } from "@/lib/uploads";

/**
 * Serves user-uploaded files (contract documents, payment QR codes).
 *
 * These used to be plain static files under `public/`, which broke in production:
 * Next.js only serves the `public/` files that existed when the server booted, so
 * anything uploaded while it was running 404'd until the container was restarted.
 * Reading from disk per request fixes that, and additionally lets uploads be
 * access-controlled and served with proper caching/range headers — which matters
 * when the deployment sits behind a reverse proxy such as a Cloudflare Tunnel.
 */

// Always hit the filesystem: never prerender or cache this route's output.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

/** Parses a single-range `Range: bytes=<start>-<end>` header against a known file size. */
function parseRange(header: string | null, size: number): { start: number; end: number } | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return null;

  let start: number;
  let end: number;
  if (!rawStart) {
    // Suffix range: the last N bytes.
    const suffixLength = Number(rawEnd);
    if (suffixLength <= 0) return "unsatisfiable";
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : size - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start > end || start >= size) return "unsatisfiable";
  return { start, end: Math.min(end, size - 1) };
}

function fileStream(filePath: string, range?: { start: number; end: number }): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(filePath, range);
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  // The proxy already blocks anonymous traffic, but uploads can hold tenant
  // contracts and payment details, so the check is repeated at the source.
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { path: segments } = await params;
  const relativePath = safeRelativeUploadPath(segments ?? []);
  const filePath = relativePath ? await resolveUploadFile(relativePath) : null;

  if (!filePath) {
    // `no-store` matters here: Cloudflare caches 404s for static-looking
    // extensions (.pdf, .png, ...) by default, which would otherwise keep
    // serving "not found" for a file that exists moments later.
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const { size } = await stat(filePath);
  const headers = new Headers({
    "Content-Type": contentTypeFor(filePath),
    // Stored filenames are unique and never rewritten, so they can be cached hard.
    // `private` keeps shared caches (Cloudflare's edge) from holding tenant files.
    "Cache-Control": "private, max-age=31536000, immutable",
    "Content-Disposition": `inline; filename="${path.basename(filePath).replace(/["\\]/g, "")}"`,
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });

  // PDF viewers (and proxies) routinely request byte ranges instead of the whole file.
  const range = parseRange(request.headers.get("range"), size);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${size}`);
    return new NextResponse(null, { status: 416, headers });
  }
  if (range) {
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    headers.set("Content-Length", String(range.end - range.start + 1));
    return new NextResponse(fileStream(filePath, range), { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new NextResponse(fileStream(filePath), { status: 200, headers });
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const response = await GET(request, context);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
