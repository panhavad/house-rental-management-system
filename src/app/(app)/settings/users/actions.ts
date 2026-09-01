"use server";

import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireWorkspaceUser } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";

const WORKSPACE_ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];

export async function createUser(formData: FormData) {
  const actor = await requirePermission(PERMISSIONS.USERS_WRITE);

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "") as Role;

  if (!name || !email || password.length < 8) {
    throw new Error("Name, email and an 8+ character password are required.");
  }
  if (!WORKSPACE_ROLES.includes(role)) {
    throw new Error("Invalid role.");
  }

  const passwordHash = await hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, workspaceId: actor.workspaceId },
  });

  await logActivity({
    workspaceId: actor.workspaceId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_CREATED",
    description: `User "${user.name}" (${user.role}) was created.`,
    performedById: actor.id,
  });

  revalidatePath("/settings/users");
}

export async function updateUserRole(userId: string, formData: FormData) {
  const actor = await requirePermission(PERMISSIONS.USERS_WRITE);
  const role = String(formData.get("role") ?? "") as Role;
  if (!WORKSPACE_ROLES.includes(role)) {
    throw new Error("Invalid role.");
  }

  const existing = await prisma.user.findFirst({ where: { id: userId, workspaceId: actor.workspaceId } });
  if (!existing) throw new Error("User not found.");

  const user = await prisma.user.update({ where: { id: userId }, data: { role } });

  await logActivity({
    workspaceId: actor.workspaceId,
    entityType: "USER",
    entityId: user.id,
    action: "USER_ROLE_UPDATED",
    description: `User "${user.name}"'s role was changed to ${user.role}.`,
    performedById: actor.id,
  });

  revalidatePath("/settings/users");
}

export async function toggleUserActive(userId: string) {
  const actor = await requireWorkspaceUser();
  if (actor.role !== "ADMIN") throw new Error("Only administrators can manage users.");

  const existing = await prisma.user.findFirst({ where: { id: userId, workspaceId: actor.workspaceId } });
  if (!existing) throw new Error("User not found.");
  if (existing.id === actor.id) throw new Error("You cannot deactivate your own account.");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !existing.isActive },
  });

  await logActivity({
    workspaceId: actor.workspaceId,
    entityType: "USER",
    entityId: user.id,
    action: user.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    description: `User "${user.name}" was ${user.isActive ? "activated" : "deactivated"}.`,
    performedById: actor.id,
  });

  revalidatePath("/settings/users");
}
