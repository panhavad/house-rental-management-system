"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { auth, unstable_update } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Switches the signed-in user's active workspace to one of the workspaces
 * that were already independently password-verified at their original
 * sign-in (stored in `session.user.availableWorkspaces`) — no password
 * needed again, but it's still impossible to switch into anything that
 * wasn't already proven at login time.
 */
export async function switchWorkspaceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const target = session.user.availableWorkspaces.find((w) => w.workspaceId === workspaceId);
  if (!target) {
    throw new Error("You don't have access to that workspace. Sign out and back in to refresh your workspace list.");
  }

  await unstable_update({
    user: {
      id: target.userId,
      role: target.role as Role,
      workspaceId: target.workspaceId,
      workspaceName: target.workspaceName,
    },
  });

  revalidatePath("/", "layout");
  redirect("/");
}

/** Remembers which workspace this email should jump straight into at future logins. */
export async function setDefaultWorkspaceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const workspaceId = String(formData.get("workspaceId") ?? "");
  const isCurrentOrAvailable =
    workspaceId === session.user.workspaceId ||
    session.user.availableWorkspaces.some((w) => w.workspaceId === workspaceId);
  if (!isCurrentOrAvailable) {
    throw new Error("You don't have access to that workspace.");
  }

  await prisma.loginPreference.upsert({
    where: { email: session.user.email.toLowerCase() },
    update: { defaultWorkspaceId: workspaceId },
    create: { email: session.user.email.toLowerCase(), defaultWorkspaceId: workspaceId },
  });

  revalidatePath("/settings/workspaces");
}
