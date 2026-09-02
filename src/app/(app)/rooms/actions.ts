"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { saveContractDocuments, deleteContractDocumentFiles } from "@/lib/contract-document";

function parseFacilityIds(formData: FormData): string[] {
  return formData.getAll("facilityIds").map(String);
}

export async function createRoom(formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);

  const apartmentId = String(formData.get("apartmentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const size = formData.get("size") ? Number(formData.get("size")) : null;
  const floor = String(formData.get("floor") ?? "").trim() || null;
  const floorPlanUrl = String(formData.get("floorPlanUrl") ?? "").trim() || null;
  const rentalFee = Number(formData.get("rentalFee") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const facilityIds = parseFacilityIds(formData);

  if (!apartmentId || !name || !type) throw new Error("Name, type and apartment are required.");

  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, workspaceId: user.workspaceId },
  });
  if (!apartment) notFound();

  const room = await prisma.room.create({
    data: {
      apartmentId,
      name,
      type,
      size,
      floor,
      floorPlanUrl,
      rentalFee,
      notes,
      facilities: { create: facilityIds.map((facilityId) => ({ facilityId })) },
    },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "ROOM",
    entityId: room.id,
    roomId: room.id,
    action: "ROOM_CREATED",
    description: `Room "${room.name}" was created.`,
    performedById: user.id,
  });

  revalidatePath(`/apartments/${apartmentId}`);
  redirect(`/rooms/${room.id}`);
}

/**
 * Clones a room's details (type, size, rentalFee, notes, facilities, etc. — but
 * never its status/contracts/payments) into a brand-new VACANT room in the same
 * apartment, then sends the user straight to its edit page so all they need to do
 * is change the name. Meant for quickly bulk-creating many similar rooms.
 */
export async function duplicateRoom(roomId: string) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);
  const existing = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
    include: { facilities: true },
  });
  if (!existing) notFound();

  const room = await prisma.room.create({
    data: {
      apartmentId: existing.apartmentId,
      name: `${existing.name} (Copy)`,
      type: existing.type,
      size: existing.size,
      floor: existing.floor,
      floorPlanUrl: existing.floorPlanUrl,
      rentalFee: existing.rentalFee,
      notes: existing.notes,
      facilities: { create: existing.facilities.map((f) => ({ facilityId: f.facilityId })) },
    },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "ROOM",
    entityId: room.id,
    roomId: room.id,
    action: "ROOM_CREATED",
    description: `Room "${room.name}" was created by duplicating "${existing.name}".`,
    performedById: user.id,
  });

  revalidatePath(`/apartments/${existing.apartmentId}`);
  redirect(`/rooms/${room.id}/edit`);
}

export async function updateRoom(roomId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);
  const existing = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!existing) notFound();

  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const size = formData.get("size") ? Number(formData.get("size")) : null;
  const floor = String(formData.get("floor") ?? "").trim() || null;
  const floorPlanUrl = String(formData.get("floorPlanUrl") ?? "").trim() || null;
  const rentalFee = Number(formData.get("rentalFee") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const facilityIds = parseFacilityIds(formData);

  if (!name || !type) throw new Error("Name and type are required.");

  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      name,
      type,
      size,
      floor,
      floorPlanUrl,
      rentalFee,
      notes,
      facilities: {
        deleteMany: {},
        create: facilityIds.map((facilityId) => ({ facilityId })),
      },
    },
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "ROOM",
    entityId: room.id,
    roomId: room.id,
    action: "ROOM_UPDATED",
    description: `Room "${room.name}" was updated.`,
    performedById: user.id,
  });

  revalidatePath(`/apartments/${room.apartmentId}`);
  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function deleteRoom(roomId: string) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);
  const existing = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!existing) notFound();

  const room = await prisma.room.delete({ where: { id: roomId } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "ROOM",
    entityId: room.id,
    action: "ROOM_DELETED",
    description: `Room "${room.name}" was deleted.`,
    performedById: user.id,
  });

  revalidatePath(`/apartments/${room.apartmentId}`);
  redirect(`/apartments/${room.apartmentId}`);
}

export async function startContract(roomId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!room) notFound();

  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantPhone = String(formData.get("tenantPhone") ?? "").trim() || null;
  const tenantEmail = String(formData.get("tenantEmail") ?? "").trim() || null;
  const tenantIdNumber = String(formData.get("tenantIdNumber") ?? "").trim() || null;
  const occupants = Math.max(1, Number(formData.get("occupants") ?? 1));
  const rentalFee = Number(formData.get("rentalFee") ?? 0);
  const deposit = Number(formData.get("deposit") ?? 0);
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!tenantName || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Tenant name, start date and end date are required.");
  }

  const [contract] = await prisma.$transaction([
    prisma.contract.create({
      data: { roomId, tenantName, tenantPhone, tenantEmail, tenantIdNumber, occupants, rentalFee, deposit, startDate, endDate, notes },
    }),
    prisma.room.update({ where: { id: roomId }, data: { status: "OCCUPIED" } }),
  ]);

  const documentFiles = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (documentFiles.length > 0) {
    const saved = await saveContractDocuments(documentFiles, contract.id);
    if (saved.length > 0) {
      await prisma.contractDocument.createMany({
        data: saved.map((doc) => ({ contractId: contract.id, ...doc })),
      });
    }
  }

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "CONTRACT",
    entityId: contract.id,
    roomId,
    action: "CONTRACT_STARTED",
    description: `New contract started with tenant "${tenantName}" (${occupants} occupant${occupants === 1 ? "" : "s"}).`,
    performedById: user.id,
  });

  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function endContract(roomId: string, contractId: string) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!room) notFound();

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: { status: "ENDED" },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "VACANT" } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "CONTRACT",
    entityId: contract.id,
    roomId,
    action: "CONTRACT_ENDED",
    description: `Contract with tenant "${contract.tenantName}" ended.`,
    performedById: user.id,
  });

  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function terminateContract(roomId: string, contractId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!room) notFound();

  const reason = String(formData.get("reason") ?? "").trim() || null;

  const contract = await prisma.contract.update({
    where: { id: contractId },
    data: { status: "TERMINATED", terminatedAt: new Date(), terminationReason: reason },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "VACANT" } });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "CONTRACT",
    entityId: contract.id,
    roomId,
    action: "CONTRACT_TERMINATED",
    description: `Contract with tenant "${contract.tenantName}" was terminated early${reason ? `: ${reason}` : "."}`,
    performedById: user.id,
  });

  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function addContractDocuments(roomId: string, contractId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!room) notFound();

  const files = formData.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    throw new Error("Please choose at least one PDF or image file to upload.");
  }

  const contract = await prisma.contract.findFirstOrThrow({ where: { id: contractId, roomId } });
  const saved = await saveContractDocuments(files, contractId);
  if (saved.length === 0) {
    throw new Error("Please choose at least one PDF or image file to upload.");
  }

  await prisma.contractDocument.createMany({
    data: saved.map((doc) => ({ contractId, ...doc })),
  });

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "CONTRACT",
    entityId: contractId,
    roomId,
    action: "CONTRACT_DOCUMENT_UPLOADED",
    description: `${saved.length} document${saved.length === 1 ? "" : "s"} uploaded for tenant "${contract.tenantName}".`,
    performedById: user.id,
  });

  revalidatePath(`/rooms/${roomId}`);
}

export async function deleteContractDocument(roomId: string, documentId: string) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId: user.workspaceId } },
  });
  if (!room) notFound();

  const doc = await prisma.contractDocument.findFirst({
    where: { id: documentId, contract: { roomId } },
  });
  if (!doc) notFound();
  await prisma.contractDocument.delete({ where: { id: documentId } });
  await deleteContractDocumentFiles(doc);

  await logActivity({
    workspaceId: user.workspaceId,
    entityType: "CONTRACT",
    entityId: doc.contractId,
    roomId,
    action: "CONTRACT_DOCUMENT_DELETED",
    description: `A contract document was removed.`,
    performedById: user.id,
  });

  revalidatePath(`/rooms/${roomId}`);
}
