import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

/**
 * The on-disk mirror of maintenance mode.
 *
 * The database (`PlatformSetting`, see `src/lib/maintenance.ts`) stays the source
 * of truth, but two consumers cannot reach it:
 *
 * 1. `src/proxy.ts` runs on every single request; a Prisma round-trip there would
 *    tax the (single-writer) SQLite connection for something that changes twice a
 *    year. It reads this small JSON file instead.
 * 2. The nginx container in `docker-compose.yml` keeps answering while the app
 *    container is stopped for an update — it has no database at all, so the
 *    ready-to-serve `maintenance.html` written here is what visitors get instead
 *    of a browser connection error.
 *
 * Both files live in a directory that is shared with nginx as a Docker volume.
 * Nothing here imports Prisma, so `proxy.ts` stays free of the database client.
 */

export type MaintenanceState = {
  enabled: boolean;
  /** Optional note from the Super Admin, e.g. "Back around 9pm". */
  message: string | null;
  /** ISO timestamp of when the current window was started, if any. */
  startedAt: string | null;
};

export const MAINTENANCE_OFF: MaintenanceState = { enabled: false, message: null, startedAt: null };

/**
 * Directory holding the mirror. Override with `MAINTENANCE_DIR` (Docker points it
 * at `/app/data/maintenance`, a volume nginx also mounts read-only). The default
 * keeps `npm run dev` / `npm run start` self-contained inside the project, next to
 * the other runtime data in `data/`.
 */
export const MAINTENANCE_DIR = process.env.MAINTENANCE_DIR
  ? path.resolve(process.env.MAINTENANCE_DIR)
  : path.join(process.cwd(), "data", "maintenance");

/** Machine-readable state, read by `proxy.ts` on every request. */
export const MAINTENANCE_STATE_FILE = path.join(MAINTENANCE_DIR, "state.json");

/** Pre-rendered page nginx serves while the app container is down. */
export const MAINTENANCE_PAGE_FILE = path.join(MAINTENANCE_DIR, "maintenance.html");

/** How long a read of the state file is reused before touching the disk again. */
const CACHE_TTL_MS = 2000;

let cached: { at: number; state: MaintenanceState | null } | null = null;

/** Drops the in-process cache so the very next read reflects a just-written change. */
export function invalidateMaintenanceFlagCache(): void {
  cached = null;
}

/**
 * Reads the mirrored state. Returns `null` when the file doesn't exist yet or is
 * unreadable/corrupt — callers treat that as "unknown" and fall back to the
 * database, which then rewrites the mirror.
 */
export async function readMaintenanceFlag(): Promise<MaintenanceState | null> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.state;

  let state: MaintenanceState | null = null;
  try {
    const parsed = JSON.parse(await readFile(MAINTENANCE_STATE_FILE, "utf8")) as Partial<MaintenanceState>;
    state = {
      enabled: parsed.enabled === true,
      message: typeof parsed.message === "string" && parsed.message ? parsed.message : null,
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
    };
  } catch {
    state = null;
  }

  cached = { at: Date.now(), state };
  return state;
}

/**
 * Rewrites the mirror to match `state`. Also writes (or removes) the static page
 * nginx falls back to: it only exists while maintenance mode is on, so an
 * unplanned outage shows the neutral built-in "temporarily unavailable" page
 * rather than a stale, wrong "back at 9pm" note.
 */
export async function writeMaintenanceFlag(state: MaintenanceState): Promise<void> {
  await mkdir(MAINTENANCE_DIR, { recursive: true });
  await writeFile(MAINTENANCE_STATE_FILE, JSON.stringify(state, null, 2), "utf8");

  if (state.enabled) {
    await writeFile(MAINTENANCE_PAGE_FILE, renderMaintenanceHtml(state), "utf8");
  } else {
    await rm(MAINTENANCE_PAGE_FILE, { force: true });
  }

  invalidateMaintenanceFlagCache();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Renders the standalone maintenance page served by nginx. Deliberately a single
 * self-contained HTML file with inline styles — it has to render correctly when
 * the app (and therefore every CSS/JS bundle it would link to) is unreachable.
 * Keep it visually in sync with `src/app/maintenance/page.tsx`.
 */
export function renderMaintenanceHtml(state: MaintenanceState): string {
  const note = state.message
    ? `<p style="margin:0 0 1.25rem;font-size:0.9375rem;line-height:1.6;color:#334155">${escapeHtml(state.message)}</p>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="30" />
    <meta name="robots" content="noindex" />
    <title>Under maintenance · RentalHRM</title>
    <link rel="icon" href="data:," />
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:1rem;background:#f8fafc;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif">
    <main style="width:100%;max-width:28rem;border:1px solid #e2e8f0;border-radius:0.75rem;background:#ffffff;padding:2rem;box-shadow:0 1px 2px rgba(15,23,42,0.05);text-align:center">
      <div style="margin:0 auto 1.25rem;display:flex;height:3rem;width:3rem;align-items:center;justify-content:center;border-radius:9999px;background:#fef3c7">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </div>
      <h1 style="margin:0 0 0.5rem;font-size:1.25rem;font-weight:600">Under maintenance</h1>
      <p style="margin:0 0 1.25rem;font-size:0.875rem;line-height:1.6;color:#64748b">
        RentalHRM is being updated right now. Your data is safe — the system will be back automatically as soon as the update finishes.
      </p>
      ${note}
      <p style="margin:0;font-size:0.75rem;color:#94a3b8">This page refreshes itself every 30 seconds.</p>
    </main>
  </body>
</html>
`;
}
