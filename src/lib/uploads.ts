import { mkdir, readFile, stat, unlink } from "fs/promises";
import path from "path";

/**
 * Runtime-uploaded file storage.
 *
 * Why uploads deliberately do **not** live in `public/`:
 * Next.js' production server scans the `public/` directory exactly once, while it
 * boots, and remembers the file list in memory. Anything written there afterwards
 * is unknown to the router and falls through to the app router, which answers with
 * a 404 page — until the process restarts and re-scans. That is why a freshly
 * uploaded contract PDF only became reachable after `docker compose down && up`.
 *
 * Uploads are therefore written outside `public/` and served by the
 * `/uploads/[...path]` route handler, which hits the filesystem on every request.
 * The public URL shape (`/uploads/<folder>/<file>`) is unchanged, so URLs already
 * stored in the database keep working.
 */

/** URL prefix every stored upload is addressed by. Persisted in the database — keep stable. */
export const UPLOAD_URL_PREFIX = "/uploads";

/**
 * Absolute path uploads are written to. Override with `UPLOADS_DIR` (the Docker
 * image points it at the persistent `/app/data/uploads` volume). The default keeps
 * plain `npm run dev` / `npm run start` self-contained inside the project.
 */
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "data", "uploads");

/**
 * Where uploads used to be written. Still read from, so deployments (and local
 * checkouts) that already have files there keep serving them without a migration
 * step. Never written to.
 */
const LEGACY_UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/** Creates (if needed) and returns the absolute directory for an upload category. */
export async function ensureUploadDir(folder: string): Promise<string> {
  const dir = path.join(UPLOADS_ROOT, folder);
  await mkdir(dir, { recursive: true });
  return dir;
}

/** Builds the public URL for a file stored under an upload category. */
export function uploadUrl(folder: string, filename: string): string {
  return `${UPLOAD_URL_PREFIX}/${folder}/${filename}`;
}

/**
 * Turns the segments of an `/uploads/...` request into a safe relative path.
 *
 * Uploads are now served by application code rather than by the static file
 * handler, so path traversal has to be rejected explicitly: any segment that is
 * empty, `.`, `..`, absolute, or contains a NUL byte is refused outright.
 */
export function safeRelativeUploadPath(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const decoded: string[] = [];
  for (const raw of segments) {
    let segment: string;
    try {
      segment = decodeURIComponent(raw);
    } catch {
      return null;
    }
    if (!segment || segment === "." || segment === ".." || segment.includes("\0")) return null;
    if (segment.includes("/") || segment.includes("\\")) return null;
    decoded.push(segment);
  }

  return decoded.join(path.sep);
}

/** Converts a stored `/uploads/...` URL into a safe relative path, or null if it isn't one. */
export function relativePathFromUploadUrl(url: string | null | undefined): string | null {
  if (!url || !url.startsWith(`${UPLOAD_URL_PREFIX}/`)) return null;
  const withoutPrefix = url.slice(UPLOAD_URL_PREFIX.length + 1).split("?")[0].split("#")[0];
  return safeRelativeUploadPath(withoutPrefix.split("/"));
}

/**
 * Resolves a relative upload path to a file that actually exists, checking the
 * current storage root first and the legacy `public/uploads` location second.
 * Returns null when the file is missing from both.
 */
export async function resolveUploadFile(relativePath: string): Promise<string | null> {
  for (const root of [UPLOADS_ROOT, LEGACY_UPLOADS_ROOT]) {
    const candidate = path.resolve(root, relativePath);
    // Defence in depth: never escape the root even if validation above changes.
    if (candidate !== root && !candidate.startsWith(root + path.sep)) continue;
    try {
      // turbopackIgnore: the path is user data resolved at runtime, not a bundled
      // module — tracing it would pull the entire project into the build output.
      const info = await stat(/* turbopackIgnore: true */ candidate);
      if (info.isFile()) return candidate;
    } catch {
      // Try the next root.
    }
  }
  return null;
}

/** Reads a stored upload by its public URL. Throws if the file cannot be found. */
export async function readUploadBytes(url: string): Promise<Buffer> {
  const relativePath = relativePathFromUploadUrl(url);
  const absolute = relativePath ? await resolveUploadFile(relativePath) : null;
  if (!absolute) {
    throw new Error(`Upload not found: ${url}`);
  }
  return readFile(absolute);
}

/** Best-effort removal of a stored upload by its public URL. */
export async function deleteUpload(url: string | null | undefined): Promise<void> {
  const relativePath = relativePathFromUploadUrl(url);
  if (!relativePath) return;
  const absolute = await resolveUploadFile(relativePath);
  if (!absolute) return;
  try {
    await unlink(absolute);
  } catch {
    // Ignore if the file is already gone.
  }
}
