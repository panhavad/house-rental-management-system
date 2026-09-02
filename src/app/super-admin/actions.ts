"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { hash } from "bcryptjs";
import { requireSuperAdmin, IMPERSONATE_COOKIE } from "@/lib/auth-guard";
import { createWorkspaceWithAdmin } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { loadDemoData, unloadDemoData } from "@/lib/demo-data";

export async function createWorkspaceAction(formData: FormData) {
  await requireSuperAdmin();

  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const adminEmail = String(formData.get("adminEmail") ?? "")
    .trim()
    .toLowerCase();
  const adminPassword = String(formData.get("adminPassword") ?? "");

  if (!workspaceName || !adminName || !adminEmail || adminPassword.length < 8) {
    throw new Error("Workspace name, admin name, admin email and an 8+ character password are required.");
  }

  const adminPasswordHash = await hash(adminPassword, 10);
  const { workspace } = await createWorkspaceWithAdmin({
    workspaceName,
    adminName,
    adminEmail,
    adminPasswordHash,
  });

  revalidatePath("/super-admin");
  redirect(`/super-admin/workspaces/${workspace.id}`);
}

export async function setWorkspaceActive(workspaceId: string, isActive: boolean) {
  await requireSuperAdmin();
  await prisma.workspace.update({ where: { id: workspaceId }, data: { isActive } });
  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/workspaces/${workspaceId}`);
}

/**
 * Lets the super admin "enter" a workspace: from then on, every regular app page
 * treats them exactly like that workspace's Administrator (full view/modify
 * access), until they exit back to /super-admin.
 */
export async function enterWorkspace(workspaceId: string) {
  await requireSuperAdmin();

  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace) throw new Error("Workspace not found.");
  if (!workspace.isActive) throw new Error("This workspace is disabled.");

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/");
}

/**
 * Loads (or refreshes) the demo workspace: two fully furnished apartments covering
 * every room/contract/payment status, utility readings, rate history, and a demo
 * login account per role. Always rebuilds from scratch so dates stay relative to
 * "today". Completely isolated in its own workspace — never touches any real
 * workspace or user.
 */
export async function loadDemoDataAction() {
  await requireSuperAdmin();
  const { workspace } = await loadDemoData();
  revalidatePath("/super-admin");
  redirect(`/super-admin/workspaces/${workspace.id}`);
}

/** Deletes the demo workspace and everything in it. A no-op if none is loaded. */
export async function unloadDemoDataAction() {
  await requireSuperAdmin();
  await unloadDemoData();
  revalidatePath("/super-admin");
  redirect("/super-admin");
}
