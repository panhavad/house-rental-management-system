import { NextResponse } from "next/server";
import { requireWorkspaceUser, requireSuperAdmin } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { exportWorkspaceBackup, exportAllWorkspacesBackup, exportWorkspacesBackup, backupFilename } from "@/lib/backup";

function downloadJson(data: unknown, filename: string): NextResponse {
  return new NextResponse(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Downloads a backup as a JSON file attachment:
 * - `?scope=all`             — every workspace, bundled (super admin only)
 * - `?workspaceIds=<a>,<b>`  — several specific workspaces, bundled (super admin only)
 * - `?workspaceId=<id>`      — one specific workspace (super admin only)
 * - (no params)              — the caller's own workspace (workspace admin, or a
 *                              super admin currently "entered" into a workspace)
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");
  const workspaceId = searchParams.get("workspaceId");
  const workspaceIdsParam = searchParams.get("workspaceIds");

  if (scope === "all") {
    await requireSuperAdmin();
    const bundle = await exportAllWorkspacesBackup();
    return downloadJson(bundle, backupFilename("all-workspaces"));
  }

  if (workspaceIdsParam) {
    await requireSuperAdmin();
    const ids = workspaceIdsParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No workspaces selected." }, { status: 400 });
    }
    const bundle = await exportWorkspacesBackup(ids);
    return downloadJson(bundle, backupFilename(ids.length === 1 ? "workspace" : `${ids.length}-workspaces`));
  }

  if (workspaceId) {
    await requireSuperAdmin();
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }
    const backup = await exportWorkspaceBackup(workspaceId);
    return downloadJson(backup, backupFilename(workspace.slug));
  }

  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only workspace administrators can download a backup." }, { status: 403 });
  }
  const workspace = await prisma.workspace.findUnique({ where: { id: user.workspaceId } });
  const backup = await exportWorkspaceBackup(user.workspaceId);
  return downloadJson(backup, backupFilename(workspace?.slug ?? "workspace"));
}

