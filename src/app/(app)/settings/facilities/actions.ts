"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";

export async function createFacility(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.FACILITIES_WRITE);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Facility name is required.");

  const facility = await prisma.facility.create({ data: { name, workspaceId: user.workspaceId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "FACILITY",
    entityId: facility.id,
    action: "FACILITY_CREATED",
    description: `Facility "${facility.name}" was created.`,
    performedById: user.id,
  });

  revalidatePath("/settings/facilities");
}

export async function deleteFacility(facilityId: string) {
  const user = await requirePermission(PERMISSIONS.FACILITIES_WRITE);
  const existing = await prisma.facility.findFirst({
    where: { id: facilityId, workspaceId: user.workspaceId },
  });
  if (!existing) throw new Error("Facility not found.");

  const facility = await prisma.facility.delete({ where: { id: facilityId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "FACILITY",
    entityId: facility.id,
    action: "FACILITY_DELETED",
    description: `Facility "${facility.name}" was deleted.`,
    performedById: user.id,
  });

  revalidatePath("/settings/facilities");
}
