import { prisma } from "@/lib/prisma";
import { DEFAULT_ROLE_PERMISSIONS_SEED } from "@/lib/rbac";

/** Turns a workspace display name into a URL/login-friendly slug, e.g. "Sunrise Rentals" -> "sunrise-rentals". */
export function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Appends -2, -3, ... to a slug until it's unique among workspaces. */
export async function uniqueSlug(base: string): Promise<string> {
  const root = base || "workspace";
  let candidate = root;
  let n = 1;
  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

/**
 * Creates a brand-new, fully isolated workspace along with its first admin user.
 * Also seeds the default role permission matrix and a starter currency setting so
 * the workspace is immediately usable.
 */
export async function createWorkspaceWithAdmin(params: {
  workspaceName: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
}) {
  const slug = await uniqueSlug(slugify(params.workspaceName));

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: params.workspaceName, slug },
    });

    const admin = await tx.user.create({
      data: {
        workspaceId: workspace.id,
        name: params.adminName,
        email: params.adminEmail.toLowerCase(),
        passwordHash: params.adminPasswordHash,
        role: "ADMIN",
      },
    });

    await tx.appSetting.create({ data: { workspaceId: workspace.id } });

    await tx.rolePermission.createMany({
      data: DEFAULT_ROLE_PERMISSIONS_SEED.map((row) => ({ ...row, workspaceId: workspace.id })),
    });

    return { workspace, admin };
  });
}

/** Creates an additional workspace for an existing admin, reusing their credentials. */
export async function createAdditionalWorkspace(params: {
  workspaceName: string;
  adminName: string;
  adminEmail: string;
  adminPasswordHash: string;
}) {
  return createWorkspaceWithAdmin(params);
}

/** All workspaces where this email holds an ADMIN account (used for the workspace switcher). */
export async function getWorkspacesForAdminEmail(email: string) {
  const users = await prisma.user.findMany({
    where: { email: email.toLowerCase(), role: "ADMIN" },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
  return users.filter((u) => u.workspace).map((u) => u.workspace!);
}
