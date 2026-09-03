import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isMaintenanceModeOn } from "@/lib/maintenance";
import { Permission, hasPermission, getRolePermissionMatrix } from "@/lib/rbac";
import type { Session } from "next-auth";

/** Cookie that remembers which workspace a super admin is currently "entered" into. */
export const IMPERSONATE_COOKIE = "impersonate_ws";

/**
 * A signed-in user known to belong to a workspace (i.e. not the super admin) — or
 * a super admin who has "entered" a workspace to manage it directly.
 */
export type WorkspaceUser = Session["user"] & {
  workspaceId: string;
  /** True when this is really the super admin acting inside someone else's workspace. */
  impersonating?: boolean;
};

/**
 * Ensures a user is signed in. Redirects to /login if not.
 * Use in Server Components / Server Actions that require any authenticated user.
 */
export async function requireUser(): Promise<Session["user"]> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

/**
 * Ensures a user is signed in AND belongs to a workspace. The super admin has no
 * workspace of their own, but can "enter" any workspace from `/super-admin` — while
 * entered, they're treated exactly like that workspace's Administrator (full
 * access to view and modify everything), so every other page's permission checks
 * work unchanged. Their real identity (super admin) is preserved for activity-log
 * attribution and for the "exit" banner.
 *
 * If a super admin hasn't entered a workspace, redirect to their own area instead —
 * this keeps every regular page free of null-workspace edge cases.
 *
 * Also the single choke point for maintenance mode: every workspace page and every
 * workspace server action goes through here, so one check locks the whole app down
 * for everyone but the Super Admin. The check looks at their *real* role, so a
 * Super Admin who has entered a workspace still works normally during the window.
 */
export async function requireWorkspaceUser(): Promise<WorkspaceUser> {
  const user = await requireUser();

  // Checked against the database rather than the proxy's cached flag file, so a
  // stale mirror can never let a write through during a maintenance window.
  if (user.role !== "SUPER_ADMIN" && (await isMaintenanceModeOn())) {
    redirect("/maintenance");
  }

  if (user.role === "SUPER_ADMIN") {
    const cookieStore = await cookies();
    const enteredWorkspaceId = cookieStore.get(IMPERSONATE_COOKIE)?.value;
    const workspace = enteredWorkspaceId
      ? await prisma.workspace.findUnique({ where: { id: enteredWorkspaceId } })
      : null;

    if (!workspace || !workspace.isActive) {
      redirect("/super-admin");
    }

    return {
      ...user,
      role: "ADMIN",
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      impersonating: true,
    };
  }

  if (!user.workspaceId) {
    redirect("/login");
  }
  return user as WorkspaceUser;
}

/** Ensures the signed-in user is the platform super admin. Redirects everyone else away. */
export async function requireSuperAdmin(): Promise<Session["user"]> {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") {
    redirect(user.workspaceId ? "/" : "/login");
  }
  return user;
}

/**
 * Ensures the signed-in user holds the given permission within their workspace.
 * Redirects unauthenticated users to /login, and signed-in users lacking the
 * permission to the dashboard (read-only access is still allowed elsewhere).
 */
export async function requirePermission(permission: Permission): Promise<WorkspaceUser> {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  if (!hasPermission(matrix, user.role, permission)) {
    redirect("/");
  }
  return user;
}
