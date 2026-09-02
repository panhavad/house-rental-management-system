"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAdditionalWorkspace } from "@/lib/workspace";
import { logActivity } from "@/lib/activity-log";
import { unstable_update } from "@/auth";

/**
 * Lets an existing admin spin up an additional, fully separate workspace for
 * themselves — reusing their current email + password so they can switch to
 * it instantly from the workspace switcher (no need to log out and back in).
 */
export async function createOwnWorkspace(formData: FormData) {
  const actor = await requireWorkspaceUser();
  if (actor.role !== "ADMIN") {
    throw new Error("Only administrators can create additional workspaces.");
  }

  const workspaceName = String(formData.get("workspaceName") ?? "").trim();
  if (!workspaceName) throw new Error("Workspace name is required.");

  const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });

  const { workspace, admin } = await createAdditionalWorkspace({
    workspaceName,
    adminName: currentUser.name,
    adminEmail: currentUser.email,
    adminPasswordHash: currentUser.passwordHash,
  });

  await logActivity({
    workspaceId: workspace.id,
    entityType: "WORKSPACE",
    entityId: workspace.id,
    action: "WORKSPACE_CREATED",
    description: `Workspace "${workspace.name}" was created by ${currentUser.name} from an existing workspace.`,
    performedById: admin.id,
  });

  if (!actor.impersonating) {
    await unstable_update({
      user: {
        availableWorkspaces: [
          ...actor.availableWorkspaces,
          {
            userId: admin.id,
            role: admin.role,
            workspaceId: workspace.id,
            workspaceName: workspace.name,
            workspaceSlug: workspace.slug,
          },
        ],
      },
    });
  }

  revalidatePath("/settings/workspaces");
  redirect("/settings/workspaces");
}

