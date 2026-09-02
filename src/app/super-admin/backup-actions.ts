"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { parseBackupFile, restoreWorkspaceBackup, restoreBundleBackup } from "@/lib/backup";
import { duplicateWorkspaces } from "@/lib/workspace-duplicate";
import type { RestoreState } from "@/components/ui/RestoreButton";

/**
 * Restores a backup uploaded from the main Super Admin dashboard. Accepts
 * either a single-workspace backup or an "all workspaces" bundle — whichever
 * workspaces the file contains are restored in place; nothing else is touched.
 */
export async function restoreAnyWorkspaceBackupAction(formData: FormData): Promise<RestoreState> {
  await requireSuperAdmin();

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

  revalidatePath("/super-admin");

  if (parsed.kind === "bundle") {
    const results = await restoreBundleBackup(parsed.data);
    const failed = results.filter((r) => r.error);
    const warnings = results.filter((r) => r.warning);
    if (failed.length > 0) {
      return {
        error: `Restored ${results.length - failed.length} of ${results.length} workspace(s). Failed: ${failed
          .map((f) => `${f.workspaceName} (${f.error})`)
          .join("; ")}`,
      };
    }
    const warningText = warnings.length ? ` ${warnings.map((w) => w.warning).join(" ")}` : "";
    return { success: `Restored ${results.length} workspace(s) from the bundle.${warningText}` };
  }

  let warning: string | undefined;
  try {
    ({ warning } = await restoreWorkspaceBackup(parsed.data));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Restore failed." };
  }
  revalidatePath(`/super-admin/workspaces/${parsed.data.workspace.id}`);
  const baseMessage = `Restored workspace "${parsed.data.workspace.name}" from the backup taken ${new Date(
    parsed.data.exportedAt
  ).toLocaleString()}.`;
  return { success: warning ? `${baseMessage} ${warning}` : baseMessage };
}

/**
 * Restores a backup uploaded from a specific workspace's detail page. Rejects
 * anything that isn't a single-workspace backup for exactly that workspace —
 * this is the "restore this workspace to a prior state" entry point, not a
 * general import tool.
 */
export async function restoreSpecificWorkspaceBackupAction(
  targetWorkspaceId: string,
  formData: FormData
): Promise<RestoreState> {
  await requireSuperAdmin();

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
      error: "This file contains multiple workspaces — use the bundle restore option on the Super Admin dashboard.",
    };
  }
  if (parsed.data.workspace.id !== targetWorkspaceId) {
    return {
      error: `This backup is for a different workspace ("${parsed.data.workspace.name}") and can't be restored here.`,
    };
  }

  let warning: string | undefined;
  try {
    ({ warning } = await restoreWorkspaceBackup(parsed.data));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Restore failed." };
  }

  revalidatePath("/super-admin");
  revalidatePath(`/super-admin/workspaces/${targetWorkspaceId}`);
  const baseMessage = `Restored from the backup taken ${new Date(parsed.data.exportedAt).toLocaleString()}.`;
  return { success: warning ? `${baseMessage} ${warning}` : baseMessage };
}

export type BulkActionResult = { message: string; error?: boolean };

/** Permanently deletes several workspaces and everything in them. */
export async function deleteWorkspacesAction(ids: string[]): Promise<BulkActionResult> {
  await requireSuperAdmin();
  if (ids.length === 0) return { message: "No workspaces selected.", error: true };

  const result = await prisma.workspace.deleteMany({ where: { id: { in: ids } } });
  revalidatePath("/super-admin");
  return { message: `Deleted ${result.count} workspace(s).` };
}

/** Duplicates several workspaces into brand-new, independent copies. */
export async function duplicateWorkspacesAction(ids: string[]): Promise<BulkActionResult> {
  await requireSuperAdmin();
  if (ids.length === 0) return { message: "No workspaces selected.", error: true };

  const results = await duplicateWorkspaces(ids);
  const failed = results.filter((r) => r.error);
  revalidatePath("/super-admin");

  if (failed.length > 0) {
    return {
      message: `Duplicated ${results.length - failed.length} of ${results.length} workspace(s). Failed: ${failed
        .map((f) => `${f.sourceName} (${f.error})`)
        .join("; ")}`,
      error: true,
    };
  }
  return {
    message: `Duplicated ${results.length} workspace(s): ${results.map((r) => r.newName).join(", ")}.`,
  };
}
