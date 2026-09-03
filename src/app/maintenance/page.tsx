import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { auth } from "@/auth";
import { getMaintenanceSetting } from "@/lib/maintenance";
import { StatusLink } from "@/components/ui/StatusLink";

export const metadata: Metadata = {
  title: "Under maintenance · RentalHRM",
  robots: { index: false, follow: false },
};

// Reads the live maintenance flag on every request — it must never be answered
// from a prerendered/cached copy, and the database isn't reachable at build time.
export const dynamic = "force-dynamic";

/**
 * The notice everyone except the Super Admin sees while the platform is in
 * maintenance mode. `proxy.ts` sends them here with `?from=` set to the page they
 * were trying to reach, so the periodic refresh below drops them right back on it
 * the moment the window ends.
 *
 * Keep it visually in sync with `renderMaintenanceHtml()` in
 * `src/lib/maintenance-flag.ts`, which is the static twin nginx serves while the
 * app container itself is stopped.
 */
export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [maintenance, session, { from }] = await Promise.all([
    getMaintenanceSetting(),
    auth(),
    searchParams,
  ]);

  // Only ever bounce back to a path on this site — never to a caller-supplied
  // absolute URL (`//evil.example`, `/\evil.example`), and never back to this page.
  const returnTo =
    from &&
    from.startsWith("/") &&
    !from.startsWith("//") &&
    !from.startsWith("/\\") &&
    !from.startsWith("/maintenance")
      ? from
      : "/";

  // Reached directly (or a leftover tab refreshed) after the window ended.
  if (!maintenance.enabled) {
    redirect(returnTo);
  }

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const startedAt = maintenance.startedAt ? new Date(maintenance.startedAt) : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      {/* Retry on a timer so nobody has to sit there hitting reload. */}
      <meta httpEquiv="refresh" content="30" />
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Wrench className="h-6 w-6 text-amber-700" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Under maintenance</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          RentalHRM is being updated right now. Your data is safe — the system will be back automatically as
          soon as the update finishes.
        </p>

        {maintenance.message ? (
          <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {maintenance.message}
          </p>
        ) : null}

        {startedAt ? (
          <p className="mt-5 text-xs text-slate-400">Maintenance started {startedAt.toLocaleString()}.</p>
        ) : null}
        <p className="mt-1 text-xs text-slate-400">This page refreshes itself every 30 seconds.</p>

        <p className="mt-6 text-sm text-slate-500">
          {isSuperAdmin ? (
            <StatusLink
              href="/super-admin"
              className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
              spinnerClassName="h-3.5 w-3.5"
            >
              Go to Super Admin to end maintenance
            </StatusLink>
          ) : (
            <StatusLink
              href="/login"
              className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
              spinnerClassName="h-3.5 w-3.5"
            >
              Administrator sign in
            </StatusLink>
          )}
        </p>
      </div>
    </div>
  );
}
