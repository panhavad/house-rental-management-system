"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { logActivity } from "@/lib/activity-log";
import { Currency } from "@prisma/client";

/** Every setup action is gated the same way: signed in, and an admin of the workspace being set up. */
async function requireSetupAdmin() {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") {
    redirect("/");
  }
  return user;
}

export async function setupSaveCurrency(formData: FormData) {
  const user = await requireSetupAdmin();

  const currency = String(formData.get("currency") ?? "USD") as Currency;
  const exchangeRate = Number(formData.get("exchangeRate") ?? 4100);

  await prisma.appSetting.upsert({
    where: { workspaceId: user.workspaceId },
    update: { currency, exchangeRate: exchangeRate > 0 ? exchangeRate : 4100 },
    create: { workspaceId: user.workspaceId, currency, exchangeRate: exchangeRate > 0 ? exchangeRate : 4100 },
  });

  redirect("/setup?step=2");
}

export async function setupCreateApartment(formData: FormData) {
  const user = await requireSetupAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;

  if (!name) {
    redirect("/setup?step=2&error=" + encodeURIComponent("Apartment name is required."));
  }

  const apartment = await prisma.apartment.create({
    data: { name, address, workspaceId: user.workspaceId },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "APARTMENT",
    entityId: apartment.id,
    action: "APARTMENT_CREATED",
    description: `Apartment "${apartment.name}" was created during setup.`,
    performedById: user.id,
  });

  redirect(`/setup?step=3&apartmentId=${apartment.id}`);
}

export async function setupCreateRoom(apartmentId: string, formData: FormData) {
  const user = await requireSetupAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const rentalFee = Number(formData.get("rentalFee") ?? 0);

  if (!name || !type) {
    redirect(`/setup?step=3&apartmentId=${apartmentId}&error=` + encodeURIComponent("Name and type are required."));
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, workspaceId: user.workspaceId },
  });
  if (!apartment) redirect("/setup?step=2");

  const room = await prisma.room.create({
    data: { apartmentId, name, type, rentalFee },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "ROOM",
    entityId: room.id,
    roomId: room.id,
    action: "ROOM_CREATED",
    description: `Room "${room.name}" was created during setup.`,
    performedById: user.id,
  });

  redirect("/setup?step=4");
}

export async function setupSaveRates(formData: FormData) {
  const user = await requireSetupAdmin();

  const waterRate = Number(formData.get("waterRate") ?? 0);
  const electricityRate = Number(formData.get("electricityRate") ?? 0);

  if (waterRate > 0) {
    await prisma.utilityRate.create({
      data: { type: "WATER", pricePerUnit: waterRate, workspaceId: user.workspaceId },
    });
  }
  if (electricityRate > 0) {
    await prisma.utilityRate.create({
      data: { type: "ELECTRICITY", pricePerUnit: electricityRate, workspaceId: user.workspaceId },
    });
  }

  redirect("/setup?step=5");
}

export async function setupFinish() {
  const user = await requireSetupAdmin();

  await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: { onboardingCompletedAt: new Date() },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "WORKSPACE",
    entityId: user.workspaceId,
    action: "WORKSPACE_SETUP_COMPLETED",
    description: "Workspace setup was completed.",
    performedById: user.id,
  });

  revalidatePath("/", "layout");
  redirect("/");
}
