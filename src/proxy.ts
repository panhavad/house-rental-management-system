import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { readMaintenanceFlag } from "@/lib/maintenance-flag";

/**
 * The maintenance notice. Deliberately public: it is the one page that re-reads
 * the authoritative maintenance flag from the database (repairing the cached file
 * this proxy reads if the two ever disagree), so signed-out visitors have to be
 * able to reach it. When maintenance is *off* the page itself sends them home.
 */
const MAINTENANCE_PATH = "/maintenance";

/**
 * Paths that stay reachable while the platform is in maintenance mode: the
 * maintenance notice itself, and sign-in — the Super Admin has to be able to log
 * in to turn maintenance back off. (`/api/*` is already outside the matcher, so
 * the Auth.js endpoints backing the sign-in form keep working too.)
 */
function isMaintenanceExempt(pathname: string): boolean {
  return pathname === MAINTENANCE_PATH || pathname === "/login";
}

// Next.js 16 renamed `middleware.ts` -> `proxy.ts`; the exported function must
// be named `proxy` (or be the default export). Runs on the Node.js runtime.
// `auth()` here only verifies the JWT session cookie (no database access).
export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isPublicAuthPage = pathname === "/login" || pathname === "/signup";

  // A session is only ever consistent if SUPER_ADMIN has no workspace and every
  // other role has one. A session that violates this can only be a stale JWT
  // issued before workspace support existed (or after a workspace was deleted).
  // Left alone, it bounces forever between "/" (redirecting super-admin-like
  // sessions to /super-admin) and "/super-admin" (redirecting everyone else back
  // to "/") — an infinite redirect loop. Force a clean re-login instead.
  const user = req.auth?.user;
  const isConsistentSession = !user || (user.role === "SUPER_ADMIN" ? !user.workspaceId : !!user.workspaceId);

  if (isLoggedIn && !isConsistentSession) {
    const loginUrl = new URL("/login", req.nextUrl);
    const response = NextResponse.redirect(loginUrl);
    for (const cookie of req.cookies.getAll()) {
      if (cookie.name.toLowerCase().includes("authjs") || cookie.name.toLowerCase().includes("next-auth")) {
        response.cookies.delete(cookie.name);
      }
    }
    return response;
  }

  // Platform-wide maintenance mode: everyone except the Super Admin is parked on
  // the maintenance notice, so a system update never races with other people's
  // writes. Checked before the sign-in redirect below so signed-out visitors are
  // told what's going on instead of being sent to a login form they can't use.
  // The state is read from a small JSON file rather than the database — this runs
  // on every request, and the file is also what the nginx container serves from
  // while the app itself is stopped for the update.
  if (user?.role !== "SUPER_ADMIN" && !isMaintenanceExempt(pathname)) {
    const maintenance = await readMaintenanceFlag();
    if (maintenance?.enabled) {
      // A redirect rather than a rewrite: behind a reverse proxy (the nginx
      // container, a tunnel, ...) the public host/port isn't the one the server
      // listens on, and Next.js then treats a rewritten absolute URL as an
      // *external* one and tries to fetch it over the network, which fails.
      // `?from=` remembers the page they wanted so the notice can send them back
      // there once maintenance is over.
      const maintenanceUrl = new URL(MAINTENANCE_PATH, req.nextUrl);
      if (pathname !== "/") {
        maintenanceUrl.searchParams.set("from", pathname);
      }
      return NextResponse.redirect(maintenanceUrl);
    }
  }

  if (isPublicAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn && pathname !== MAINTENANCE_PATH) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // `fonts/` is excluded so the bundled Khmer webface is always served as a
    // static asset: it is needed by the public login and maintenance pages, and
    // being redirected to /login would otherwise hand the browser an HTML page
    // in place of the font, leaving Khmer text to fall back to a system font.
    "/((?!api|_next/static|_next/image|fonts/|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|favicon-32\\.png).*)",
  ],
};
