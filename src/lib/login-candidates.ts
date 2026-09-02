import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

/**
 * One account a given email + password combination is valid for. There can be
 * more than one because the same email can be used as: the platform Super
 * Admin, and/or an Administrator/Manager/Staff/Viewer in one or more
 * independent workspaces (each with its own, independently-set password).
 */
export type LoginCandidate =
  | { kind: "super-admin"; userId: string; name: string }
  | {
      kind: "workspace";
      userId: string;
      name: string;
      role: string;
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
    };

/**
 * Finds every account (Super Admin and/or workspace memberships) this email +
 * password combination is genuinely valid for, verifying the password against
 * each candidate's own hash independently (never trusts anything the caller
 * claims — this is the single source of truth used by both the login form's
 * "which workspace?" step and `authorize()` itself).
 */
export async function findLoginCandidates(email: string, password: string): Promise<LoginCandidate[]> {
  const normalizedEmail = email.trim().toLowerCase();

  const [superAdmins, workspaceUsers] = await Promise.all([
    prisma.user.findMany({
      where: { email: normalizedEmail, workspaceId: null, role: "SUPER_ADMIN", isActive: true },
    }),
    prisma.user.findMany({
      where: { email: normalizedEmail, workspaceId: { not: null }, isActive: true, workspace: { isActive: true } },
      include: { workspace: true },
    }),
  ]);

  const candidates: LoginCandidate[] = [];

  for (const admin of superAdmins) {
    if (await compare(password, admin.passwordHash)) {
      candidates.push({ kind: "super-admin", userId: admin.id, name: admin.name });
    }
  }

  for (const user of workspaceUsers) {
    if (!user.workspace) continue;
    if (await compare(password, user.passwordHash)) {
      candidates.push({
        kind: "workspace",
        userId: user.id,
        name: user.name,
        role: user.role,
        workspaceId: user.workspace.id,
        workspaceName: user.workspace.name,
        workspaceSlug: user.workspace.slug,
      });
    }
  }

  return candidates;
}
