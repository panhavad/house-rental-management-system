import { prisma } from "@/lib/prisma";
import {
  MAINTENANCE_OFF,
  MaintenanceState,
  readMaintenanceFlag,
  writeMaintenanceFlag,
} from "@/lib/maintenance-flag";

/**
 * Platform-wide maintenance mode.
 *
 * While it is on, everyone except the Super Admin is locked out of the app and
 * sent to `/maintenance`, so a system update (migrations, restores, an image
 * rebuild) can run without other users writing to the database at the same time.
 *
 * The `PlatformSetting` row is the source of truth; every write also refreshes
 * the on-disk mirror in `maintenance-flag.ts` that `proxy.ts` and the nginx
 * container read. Reads repair the mirror when the two ever disagree (e.g. after
 * a database restore that rolled the flag back), so the system is self-healing.
 */

/** The single `PlatformSetting` row's fixed primary key. */
const PLATFORM_SETTING_ID = "platform";

export type MaintenanceSetting = MaintenanceState & {
  /** Id of the Super Admin who last flipped the switch, if known. */
  byId: string | null;
};

function toSetting(row: {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  maintenanceStartedAt: Date | null;
  maintenanceById: string | null;
} | null): MaintenanceSetting {
  if (!row || !row.maintenanceMode) return { ...MAINTENANCE_OFF, byId: null };
  return {
    enabled: true,
    message: row.maintenanceMessage?.trim() || null,
    startedAt: row.maintenanceStartedAt?.toISOString() ?? null,
    byId: row.maintenanceById,
  };
}

/** Reads the authoritative maintenance state, repairing the on-disk mirror if it drifted. */
export async function getMaintenanceSetting(): Promise<MaintenanceSetting> {
  let row;
  try {
    row = await prisma.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
  } catch {
    // This check sits in the auth guard, i.e. on every page and every server action.
    // If the query itself fails — most plausibly the table not existing yet because
    // the app was started before `prisma migrate deploy` ran — fall back to the
    // on-disk mirror rather than 500-ing the entire app (including the Super Admin's
    // own screens, which are the only way to fix anything).
    const mirrored = await readMaintenanceFlag();
    return { ...(mirrored ?? MAINTENANCE_OFF), byId: null };
  }

  const setting = toSetting(row);

  const mirrored = await readMaintenanceFlag();
  if (!mirrored || mirrored.enabled !== setting.enabled || mirrored.message !== setting.message) {
    await writeMaintenanceFlag({
      enabled: setting.enabled,
      message: setting.message,
      startedAt: setting.startedAt,
    });
  }

  return setting;
}

/** Convenience wrapper for the common "is the app locked down right now?" check. */
export async function isMaintenanceModeOn(): Promise<boolean> {
  return (await getMaintenanceSetting()).enabled;
}

/**
 * Turns maintenance mode on or off. Re-enabling while already on only updates the
 * message and keeps the original start time, so the "in maintenance since ..."
 * readout doesn't reset every time the note is edited.
 */
export async function setMaintenanceMode(params: {
  enabled: boolean;
  message?: string | null;
  byId?: string | null;
}): Promise<MaintenanceSetting> {
  const message = params.message?.trim() || null;
  const existing = await prisma.platformSetting.findUnique({ where: { id: PLATFORM_SETTING_ID } });
  const startedAt = params.enabled
    ? (existing?.maintenanceMode ? existing.maintenanceStartedAt : null) ?? new Date()
    : null;

  const data = {
    maintenanceMode: params.enabled,
    maintenanceMessage: params.enabled ? message : null,
    maintenanceStartedAt: startedAt,
    maintenanceById: params.byId ?? null,
  };

  const row = await prisma.platformSetting.upsert({
    where: { id: PLATFORM_SETTING_ID },
    create: { id: PLATFORM_SETTING_ID, ...data },
    update: data,
  });

  const setting = toSetting(row);
  await writeMaintenanceFlag({
    enabled: setting.enabled,
    message: setting.message,
    startedAt: setting.startedAt,
  });

  return setting;
}
