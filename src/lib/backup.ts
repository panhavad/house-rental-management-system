import { Prisma } from "@prisma/client";
import type {
  Workspace,
  AppSetting,
  ContractTemplate,
  PaymentMethod,
  RolePermission,
  User,
  Facility,
  UtilityRate,
  Apartment,
  Room,
  RoomFacility,
  Contract,
  ContractDocument,
  UtilityReading,
  Payment,
  ActivityLog,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APP_VERSION } from "@/lib/app-info";
import { slugify, uniqueSlug } from "@/lib/workspace";

/**
 * Full-fidelity backup/restore for one workspace (or every workspace, bundled),
 * used by both the workspace admin's self-service "Backup & restore" page and
 * the super admin's platform-wide backup tools.
 *
 * Design notes for forward-compatibility ("should not conflict with future
 * updates"):
 * - Every backup file carries a `formatVersion`. `assertSupportedFormatVersion`
 *   is the single place that decides which versions can be restored; if the
 *   format ever needs to change, bump `BACKUP_FORMAT_VERSION` and add a branch
 *   there to translate older payloads forward instead of rejecting them outright.
 * - The exported shape mirrors the live Prisma models directly (no separate
 *   hand-maintained DTOs to drift out of sync), so adding an optional/defaulted
 *   column to the schema automatically flows through export and restore with no
 *   changes needed here. Removing a column or adding a new *required* column
 *   without a default is a breaking schema change independent of backups (it
 *   would also break restoring on a fresh install) and should be handled the
 *   same way any other breaking migration is: bump `BACKUP_FORMAT_VERSION` and
 *   add a translation step if old backups need to keep working.
 * - IDs are preserved exactly as exported, so restoring a workspace's own
 *   backup back into itself is a safe, idempotent "undo" — every relation
 *   (room -> apartment, payment -> contract, etc.) still lines up.
 */

export const BACKUP_FORMAT_VERSION = 1;

export type WorkspaceBackup = {
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  workspace: Workspace;
  appSetting: AppSetting | null;
  contractTemplate: ContractTemplate | null;
  paymentMethods: PaymentMethod[];
  rolePermissions: RolePermission[];
  users: User[];
  facilities: Facility[];
  utilityRates: UtilityRate[];
  apartments: Apartment[];
  rooms: Room[];
  roomFacilities: RoomFacility[];
  contracts: Contract[];
  contractDocuments: ContractDocument[];
  utilityReadings: UtilityReading[];
  payments: Payment[];
  activityLogs: ActivityLog[];
};

export type BackupBundle = {
  formatVersion: number;
  exportedAt: string;
  appVersion: string;
  scope: "all-workspaces";
  workspaces: WorkspaceBackup[];
};

/** Turns a workspace slug/label into a safe, timestamped download filename. */
export function backupFilename(label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeLabel = label.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "backup";
  return `rentalhrm-backup-${safeLabel}-${stamp}.json`;
}

/** Exports everything belonging to one workspace, preserving every original ID. */
export async function exportWorkspaceBackup(workspaceId: string): Promise<WorkspaceBackup> {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

  const [
    appSetting,
    contractTemplate,
    paymentMethods,
    rolePermissions,
    users,
    facilities,
    utilityRates,
    apartments,
    rooms,
    roomFacilities,
    contracts,
    contractDocuments,
    utilityReadings,
    payments,
    activityLogs,
  ] = await Promise.all([
    prisma.appSetting.findUnique({ where: { workspaceId } }),
    prisma.contractTemplate.findUnique({ where: { workspaceId } }),
    prisma.paymentMethod.findMany({ where: { workspaceId } }),
    prisma.rolePermission.findMany({ where: { workspaceId } }),
    prisma.user.findMany({ where: { workspaceId } }),
    prisma.facility.findMany({ where: { workspaceId } }),
    prisma.utilityRate.findMany({ where: { workspaceId } }),
    prisma.apartment.findMany({ where: { workspaceId } }),
    prisma.room.findMany({ where: { apartment: { workspaceId } } }),
    prisma.roomFacility.findMany({ where: { room: { apartment: { workspaceId } } } }),
    prisma.contract.findMany({ where: { room: { apartment: { workspaceId } } } }),
    prisma.contractDocument.findMany({ where: { contract: { room: { apartment: { workspaceId } } } } }),
    prisma.utilityReading.findMany({ where: { room: { apartment: { workspaceId } } } }),
    prisma.payment.findMany({ where: { room: { apartment: { workspaceId } } } }),
    prisma.activityLog.findMany({ where: { workspaceId } }),
  ]);

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    workspace,
    appSetting,
    contractTemplate,
    paymentMethods,
    rolePermissions,
    users,
    facilities,
    utilityRates,
    apartments,
    rooms,
    roomFacilities,
    contracts,
    contractDocuments,
    utilityReadings,
    payments,
    activityLogs,
  };
}

/** Exports every workspace on the platform as one bundle (super admin only). */
export async function exportAllWorkspacesBackup(): Promise<BackupBundle> {
  const workspaces = await prisma.workspace.findMany({ orderBy: { createdAt: "asc" } });
  const snapshots = await Promise.all(workspaces.map((w) => exportWorkspaceBackup(w.id)));
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    scope: "all-workspaces",
    workspaces: snapshots,
  };
}

/** Exports just the given workspaces as one bundle (used for "backup selected" in the super admin UI). */
export async function exportWorkspacesBackup(workspaceIds: string[]): Promise<BackupBundle> {
  const snapshots = await Promise.all(workspaceIds.map((id) => exportWorkspaceBackup(id)));
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    scope: "all-workspaces",
    workspaces: snapshots,
  };
}

function assertSupportedFormatVersion(formatVersion: unknown): void {
  if (formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `This backup uses format version ${String(formatVersion)}, but this version of RentalHRM only ` +
        `supports version ${BACKUP_FORMAT_VERSION}. Restore it with a compatible app version, or export a ` +
        `fresh backup with this version.`
    );
  }
}

// Matches the exact string shape JSON.stringify(new Date()) produces, so every
// date we ourselves exported round-trips back into a real Date on parse — no
// per-model field list to keep in sync.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function dateReviver(_key: string, value: unknown): unknown {
  return typeof value === "string" && ISO_DATE_RE.test(value) ? new Date(value) : value;
}

export type ParsedBackup = { kind: "workspace"; data: WorkspaceBackup } | { kind: "bundle"; data: BackupBundle };

/** Parses and validates an uploaded backup file, revives its dates, and checks its format version. */
export function parseBackupFile(text: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text, dateReviver);
  } catch {
    throw new Error("This file isn't valid JSON. Please choose a backup file exported from RentalHRM.");
  }

  if (!raw || typeof raw !== "object") {
    throw new Error("This file doesn't look like a RentalHRM backup.");
  }
  const obj = raw as Record<string, unknown>;
  assertSupportedFormatVersion(obj.formatVersion);

  if (obj.scope === "all-workspaces" && Array.isArray(obj.workspaces)) {
    return { kind: "bundle", data: obj as unknown as BackupBundle };
  }
  if (obj.workspace && typeof obj.workspace === "object") {
    return { kind: "workspace", data: obj as unknown as WorkspaceBackup };
  }
  throw new Error("This file doesn't look like a RentalHRM backup.");
}

/**
 * Replaces everything currently stored for one workspace with the contents of
 * a backup, preserving every original ID (so restoring a workspace's own
 * backup back into itself — the common case — is a clean, safe undo). The
 * workspace row itself is upserted rather than deleted/recreated, so this also
 * works to bring back a workspace that was deleted after the backup was taken.
 *
 * If the backup's workspace name/URL is already used by a *different*,
 * currently-existing workspace, the restore still proceeds — it renames the
 * restored workspace to "<name> (copy)" (and picks a matching free URL name)
 * and reports that back as a warning, instead of failing outright.
 */
export async function restoreWorkspaceBackup(backup: WorkspaceBackup): Promise<{ warning?: string }> {
  const workspaceId = backup.workspace.id;

  let finalName = backup.workspace.name;
  let finalSlug = backup.workspace.slug;
  let warning: string | undefined;

  const conflicting = await prisma.workspace.findUnique({ where: { slug: backup.workspace.slug } });
  if (conflicting && conflicting.id !== workspaceId) {
    finalName = `${backup.workspace.name} (copy)`;
    finalSlug = await uniqueSlug(slugify(finalName));
    warning = `A different workspace already used the name/URL "${backup.workspace.slug}", so the restored workspace was renamed to "${finalName}" (/${finalSlug}) to avoid overwriting it.`;
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Apartment deletion cascades to Room -> Contract/Payment/UtilityReading/
        // RoomFacility -> ContractDocument, per the existing schema foreign keys.
        await tx.apartment.deleteMany({ where: { workspaceId } });
        await tx.facility.deleteMany({ where: { workspaceId } });
        await tx.utilityRate.deleteMany({ where: { workspaceId } });
        await tx.user.deleteMany({ where: { workspaceId } });
        await tx.rolePermission.deleteMany({ where: { workspaceId } });
        await tx.activityLog.deleteMany({ where: { workspaceId } });
        await tx.appSetting.deleteMany({ where: { workspaceId } });
        await tx.contractTemplate.deleteMany({ where: { workspaceId } });
        await tx.paymentMethod.deleteMany({ where: { workspaceId } });

        await tx.workspace.upsert({
          where: { id: workspaceId },
          update: {
            name: finalName,
            slug: finalSlug,
            isActive: backup.workspace.isActive,
            isDemo: backup.workspace.isDemo,
            onboardingCompletedAt: backup.workspace.onboardingCompletedAt,
          },
          create: { ...backup.workspace, name: finalName, slug: finalSlug },
        });

        if (backup.appSetting) await tx.appSetting.create({ data: backup.appSetting });
        if (backup.contractTemplate) await tx.contractTemplate.create({ data: backup.contractTemplate });
        if (backup.paymentMethods.length) await tx.paymentMethod.createMany({ data: backup.paymentMethods });
        if (backup.rolePermissions.length) await tx.rolePermission.createMany({ data: backup.rolePermissions });
        if (backup.users.length) await tx.user.createMany({ data: backup.users });
        if (backup.facilities.length) await tx.facility.createMany({ data: backup.facilities });
        if (backup.utilityRates.length) await tx.utilityRate.createMany({ data: backup.utilityRates });
        if (backup.apartments.length) await tx.apartment.createMany({ data: backup.apartments });
        if (backup.rooms.length) await tx.room.createMany({ data: backup.rooms });
        if (backup.roomFacilities.length) await tx.roomFacility.createMany({ data: backup.roomFacilities });
        if (backup.contracts.length) await tx.contract.createMany({ data: backup.contracts });
        if (backup.utilityReadings.length) await tx.utilityReading.createMany({ data: backup.utilityReadings });
        if (backup.payments.length) await tx.payment.createMany({ data: backup.payments });
        if (backup.contractDocuments.length) await tx.contractDocument.createMany({ data: backup.contractDocuments });
        if (backup.activityLogs.length) await tx.activityLog.createMany({ data: backup.activityLogs });
      },
      { timeout: 30_000, maxWait: 10_000 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const model = typeof error.meta?.modelName === "string" ? error.meta.modelName : "record";
      if (model === "Workspace") {
        throw new Error(
          `Could not restore "${backup.workspace.name}": its workspace URL name ("${finalSlug}") is already used ` +
            `by a different, currently-active workspace. Try restoring again.`
        );
      }
      // Only reachable if this backup's original workspace still exists (under a
      // different name/URL) with some of the same underlying data — restoring a
      // deleted workspace's backup, the normal case, never hits this since every
      // one of its rows was freed when it was deleted.
      throw new Error(
        `Could not restore "${backup.workspace.name}": a ${model} record in this backup conflicts with data ` +
          `that already exists elsewhere, so its original workspace likely still exists under a different ` +
          `name. Remove or rename that workspace, then try again.`
      );
    }
    throw error;
  }

  return { warning };
}

export type BundleRestoreResult = { workspaceId: string; workspaceName: string; error?: string; warning?: string };

/** Restores every workspace snapshot in a bundle, independently — one failure doesn't stop the rest. */
export async function restoreBundleBackup(bundle: BackupBundle): Promise<BundleRestoreResult[]> {
  const results: BundleRestoreResult[] = [];
  for (const snapshot of bundle.workspaces) {
    try {
      const { warning } = await restoreWorkspaceBackup(snapshot);
      results.push({ workspaceId: snapshot.workspace.id, workspaceName: snapshot.workspace.name, warning });
    } catch (error) {
      results.push({
        workspaceId: snapshot.workspace.id,
        workspaceName: snapshot.workspace.name,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }
  return results;
}
