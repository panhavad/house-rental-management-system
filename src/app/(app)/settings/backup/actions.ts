"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { parseBackupFile, restoreWorkspaceBackup } from "@/lib/backup";
import type { RestoreState } from "@/components/ui/RestoreButton";

/** Restores the signed-in admin's own workspace from an uploaded backup file. */
export async function restoreOwnWorkspaceBackupAction(formData: FormData): Promise<RestoreState> {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") redirect("/");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a backup file to restore." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: "Could not read the selected file." };
  }

  let parsed;
  try {
    parsed = parseBackupFile(text);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invalid backup file." };
  }

  if (parsed.kind === "bundle") {
    return {
      error:
        "This file contains a backup of multiple workspaces. Ask your platform administrator to restore it " +
        "from the Super Admin area.",
    };
  }

  if (parsed.data.workspace.id !== user.workspaceId) {
    return { error: "This backup belongs to a different workspace and can't be restored here." };
  }

  try {
    await restoreWorkspaceBackup(parsed.data);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Restore failed." };
  }

  // performedById is intentionally omitted: restoring just replaced the Users
  // table with the backup's own snapshot, and the currently signed-in admin's
  // row isn't guaranteed to still exist with the same id (e.g. the account was
  // created after this particular backup was taken).
  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "WORKSPACE",
    entityId: user.workspaceId,
    action: "WORKSPACE_RESTORED",
    description: `Workspace data restored from a backup taken ${new Date(parsed.data.exportedAt).toLocaleString()}.`,
  });

  revalidatePath("/", "layout");
  return {
    success: `Workspace restored from the backup taken ${new Date(parsed.data.exportedAt).toLocaleString()}.`,
  };
}
