/**
 * Runs once, before the server starts handling requests.
 *
 * Maintenance mode keeps an on-disk mirror of its database flag (see
 * `src/lib/maintenance-flag.ts`) that `src/proxy.ts` and the nginx container read.
 * Syncing it here means the mirror is correct from the very first request after a
 * restart — including the case where the two could have drifted apart while the
 * server was down, e.g. a database restored from a backup taken in a different
 * maintenance state.
 */
export async function register() {
  // The proxy/edge instance has no database access and nothing to sync.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { getMaintenanceSetting } = await import("@/lib/maintenance");
    // Reading is enough: it rewrites the mirror whenever it disagrees with the database.
    await getMaintenanceSetting();
  } catch {
    // Never block startup on this — a server that can't boot can't be un-maintenanced.
  }
}
