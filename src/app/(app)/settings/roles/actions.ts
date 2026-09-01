"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const EDITABLE_ROLES: Role[] = ["MANAGER", "STAFF", "VIEWER"];

/**
 * Updates the customizable role → permission matrix from the checkbox grid.
 * Administrators are excluded — ADMIN always has every permission regardless of
 * what's stored, so it's never editable here.
 */
export async function updateRolePermissions(formData: FormData) {
  const actor = await requireWorkspaceUser();
  if (actor.role !== "ADMIN") {
    throw new Error("Only administrators can manage role permissions.");
  }

  const updates: { role: Role; permission: string; allowed: boolean }[] = [];
  for (const role of EDITABLE_ROLES) {
    for (const permission of ALL_PERMISSIONS) {
      const allowed = formData.get(`perm:${role}:${permission}`) === "on";
      updates.push({ role, permission, allowed });
    }
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.rolePermission.upsert({
        where: { workspaceId_role_permission: { workspaceId: actor.workspaceId, role: u.role, permission: u.permission } },
        create: { ...u, workspaceId: actor.workspaceId },
        update: { allowed: u.allowed },
      })
    )
  );

  await logActivity({
    workspaceId: actor.workspaceId,
    entityType: "ROLE_PERMISSION",
    entityId: "matrix",
    action: "ROLE_PERMISSIONS_UPDATED",
    description: "The role permission matrix was updated.",
    performedById: actor.id,
  });

  revalidatePath("/", "layout");
}
