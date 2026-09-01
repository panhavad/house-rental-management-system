"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";

export async function createApartment(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.APARTMENTS_WRITE);

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapUrl = String(formData.get("mapUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) throw new Error("Apartment name is required.");

  const apartment = await prisma.apartment.create({
    data: { name, address, mapUrl, description, workspaceId: user.workspaceId },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "APARTMENT",
    entityId: apartment.id,
    action: "APARTMENT_CREATED",
    description: `Apartment "${apartment.name}" was created.`,
    performedById: user.id,
  });

  revalidatePath("/apartments");
  redirect(`/apartments/${apartment.id}`);
}

export async function updateApartment(apartmentId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.APARTMENTS_WRITE);
  const existing = await prisma.apartment.findFirst({
    where: { id: apartmentId, workspaceId: user.workspaceId },
  });
  if (!existing) notFound();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const mapUrl = String(formData.get("mapUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!name) throw new Error("Apartment name is required.");

  const apartment = await prisma.apartment.update({
    where: { id: apartmentId },
    data: { name, address, mapUrl, description },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "APARTMENT",
    entityId: apartment.id,
    action: "APARTMENT_UPDATED",
    description: `Apartment "${apartment.name}" was updated.`,
    performedById: user.id,
  });

  revalidatePath("/apartments");
  revalidatePath(`/apartments/${apartmentId}`);
  redirect(`/apartments/${apartment.id}`);
}

export async function deleteApartment(apartmentId: string) {
  const user = await requirePermission(PERMISSIONS.APARTMENTS_WRITE);
  const existing = await prisma.apartment.findFirst({
    where: { id: apartmentId, workspaceId: user.workspaceId },
  });
  if (!existing) notFound();

  const apartment = await prisma.apartment.delete({ where: { id: apartmentId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "APARTMENT",
    entityId: apartment.id,
    action: "APARTMENT_DELETED",
    description: `Apartment "${apartment.name}" was deleted.`,
    performedById: user.id,
  });

  revalidatePath("/apartments");
  redirect("/apartments");
}
