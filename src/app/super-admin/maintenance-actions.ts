"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth-guard";
import { setMaintenanceMode } from "@/lib/maintenance";

/**
 * Turns maintenance mode on (or updates the note shown to users while it's on).
 * From this moment every non-Super-Admin request is parked on `/maintenance`, so
 * the database is quiet enough to update/migrate/restore safely.
 */
export async function enableMaintenanceModeAction(formData: FormData) {
  const user = await requireSuperAdmin();
  const message = String(formData.get("message") ?? "").trim().slice(0, 500);

  await setMaintenanceMode({ enabled: true, message, byId: user.id });
  revalidatePath("/super-admin");
}

/** Ends the maintenance window and lets everyone back in. */
export async function disableMaintenanceModeAction() {
  const user = await requireSuperAdmin();

  await setMaintenanceMode({ enabled: false, byId: user.id });
  revalidatePath("/super-admin");
}
