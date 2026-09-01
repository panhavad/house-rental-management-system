import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Next.js 16 renamed `middleware.ts` -> `proxy.ts`; the exported function must
// be named `proxy` (or be the default export). Runs on the Node.js runtime.
// `auth()` here only verifies the JWT session cookie (no database access).
export default auth((req) => {
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

  if (isPublicAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icon-192\\.png|icon-512\\.png|apple-touch-icon\\.png|favicon-32\\.png).*)",
  ],
};
