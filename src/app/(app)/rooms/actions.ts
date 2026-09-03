"use server";

import { revalidatePath } from "next/cache";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireWorkspaceUser } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { logActivity } from "@/lib/activity-log";
import { saveContractDocuments, saveGeneratedContractPdf, deleteContractDocumentFiles } from "@/lib/contract-document";
import { generateContractAgreementPdf, type ContractPdfData } from "@/lib/contract-pdf";
import { getWorkspaceContractTemplate } from "@/lib/contract-template";
import { getAppSettings } from "@/lib/currency";

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

type ContractFormFields = {
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  tenantIdNumber: string | null;
  occupants: number;
  rentalFee: number;
  deposit: number;
  waterMeterStart: number;
  electricityMeterStart: number;
  startDate: Date;
  endDate: Date;
  notes: string | null;
};

/** Shared by `startContract` and `previewContract` so the preview always reflects exactly what starting the contract will produce. */
function parseContractFormFields(formData: FormData): ContractFormFields {
  const tenantName = String(formData.get("tenantName") ?? "").trim();
  const tenantPhone = String(formData.get("tenantPhone") ?? "").trim() || null;
  const tenantEmail = String(formData.get("tenantEmail") ?? "").trim() || null;
  const tenantIdNumber = String(formData.get("tenantIdNumber") ?? "").trim() || null;
  const occupants = Math.max(1, Number(formData.get("occupants") ?? 1));
  const rentalFee = Number(formData.get("rentalFee") ?? 0);
  const deposit = Number(formData.get("deposit") ?? 0);
  const waterMeterStart = Number(formData.get("waterMeterStart") ?? 0);
  const electricityMeterStart = Number(formData.get("electricityMeterStart") ?? 0);
  const startDate = new Date(String(formData.get("startDate")));
  const endDate = new Date(String(formData.get("endDate")));
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!tenantName || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Tenant name, start date and end date are required.");
  }
  if (Number.isNaN(waterMeterStart) || Number.isNaN(electricityMeterStart) || waterMeterStart < 0 || electricityMeterStart < 0) {
    throw new Error("Water and electricity meter readings are required and cannot be negative.");
  }

  return {
    tenantName,
    tenantPhone,
    tenantEmail,
    tenantIdNumber,
    occupants,
    rentalFee,
    deposit,
    waterMeterStart,
    electricityMeterStart,
    startDate,
    endDate,
    notes,
  };
}

async function findContractRoom(roomId: string, workspaceId: string) {
  const room = await prisma.room.findFirst({
    where: { id: roomId, apartment: { workspaceId } },
    include: { apartment: true, facilities: { include: { facility: true } } },
  });
  if (!room) notFound();
  return room;
}

async function buildContractPdfData(opts: {
  workspaceId: string;
  room: Awaited<ReturnType<typeof findContractRoom>>;
  fields: ContractFormFields;
  contractId: string | null;
  workspaceName: string;
  preparedByName: string;
  isPreview: boolean;
  /** Defaults to now; pass the contract's creation date when re-rendering an already-started contract. */
  generatedAt?: Date;
}): Promise<ContractPdfData> {
  const settings = await getAppSettings(opts.workspaceId);
  return {
    contract: { id: opts.contractId, ...opts.fields },
    room: { name: opts.room.name, type: opts.room.type, size: opts.room.size, floor: opts.room.floor },
    apartment: { name: opts.room.apartment.name, address: opts.room.apartment.address },
    workspaceName: opts.workspaceName,
    facilityNames: opts.room.facilities.map((f) => f.facility.name),
    settings,
    preparedByName: opts.preparedByName,
    generatedAt: opts.generatedAt ?? new Date(),
    isPreview: opts.isPreview,
  };
}

/**
 * Generates the same agreement PDF `startContract` would produce, without
 * writing anything to the database — lets the "Start contract" form preview
 * the document (and iterate on the entered details) before officially
 * starting the lease. Returns the PDF as base64 so it can cross the
 * server-action boundary as plain serializable data.
 */
export async function previewContract(roomId: string, formData: FormData): Promise<{ pdfBase64: string } | { error: string }> {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await findContractRoom(roomId, user.workspaceId);

  let fields: ContractFormFields;
  try {
    fields = parseContractFormFields(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Please fill in the required contract details." };
  }

  try {
    const templateContent = await getWorkspaceContractTemplate(user.workspaceId);
    const data = await buildContractPdfData({
      workspaceId: user.workspaceId,
      room,
      fields,
      contractId: null,
      workspaceName: user.workspaceName ?? "RentalHRM",
      preparedByName: user.name ?? "Property Manager",
      isPreview: true,
    });
    const pdfBytes = await generateContractAgreementPdf(data, templateContent);
    return { pdfBase64: Buffer.from(pdfBytes).toString("base64") };
  } catch (error) {
    console.error("Failed to generate contract preview PDF:", error);
    return { error: "Couldn't generate the preview PDF. Please try again." };
  }
}

/**
 * Re-renders the agreement PDF for a contract that has already been started, so
 * it can be reviewed on screen (the same document that was generated and
 * attached when the contract began). Purely read-only — nothing is written.
 */
export async function reviewContract(
  roomId: string,
  contractId: string
): Promise<{ pdfBase64: string } | { error: string }> {
  const user = await requireWorkspaceUser();
  const room = await findContractRoom(roomId, user.workspaceId);
  const contract = await prisma.contract.findFirst({ where: { id: contractId, roomId } });
  if (!contract) return { error: "This contract could not be found." };

  try {
    // Reproduce the document as it was issued: same template, same preparer and
    // the date the contract was actually created.
    const startedLog = await prisma.activityLog.findFirst({
      where: {
        workspaceId: user.workspaceId,
        entityType: "CONTRACT",
        entityId: contract.id,
        action: "CONTRACT_STARTED",
      },
      orderBy: { createdAt: "asc" },
      include: { performedBy: true },
    });

    const templateContent = await getWorkspaceContractTemplate(user.workspaceId);
    const data = await buildContractPdfData({
      workspaceId: user.workspaceId,
      room,
      fields: contract,
      contractId: contract.id,
      workspaceName: user.workspaceName ?? "RentalHRM",
      preparedByName: startedLog?.performedBy?.name ?? user.name ?? "Property Manager",
      isPreview: false,
      generatedAt: contract.createdAt,
    });
    const pdfBytes = await generateContractAgreementPdf(data, templateContent);
    return { pdfBase64: Buffer.from(pdfBytes).toString("base64") };
  } catch (error) {
    console.error("Failed to generate contract review PDF:", error);
    return { error: "Couldn't load the contract agreement. Please try again." };
  }
}

export async function startContract(roomId: string, formData: FormData) {
  const user = await requirePermission(PERMISSIONS.CONTRACTS_WRITE);
  const room = await findContractRoom(roomId, user.workspaceId);
  const fields = parseContractFormFields(formData);
  const { tenantName, occupants } = fields;

  const [contract] = await prisma.$transaction([
    prisma.contract.create({
      data: { roomId, ...fields },
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

  // Auto-draft a print-ready rental agreement PDF from everything just
  // entered, attached as a contract document alongside any manual uploads.
  try {
    const templateContent = await getWorkspaceContractTemplate(user.workspaceId);
    const data = await buildContractPdfData({
      workspaceId: user.workspaceId,
      room,
      fields: contract,
      contractId: contract.id,
      workspaceName: user.workspaceName ?? "RentalHRM",
      preparedByName: user.name ?? "Property Manager",
      isPreview: false,
    });
    const pdfBytes = await generateContractAgreementPdf(data, templateContent);
    const savedAgreement = await saveGeneratedContractPdf(pdfBytes, contract.id);
    await prisma.contractDocument.create({ data: { contractId: contract.id, ...savedAgreement } });
  } catch (error) {
    // A PDF generation hiccup shouldn't block the contract itself from being created.
    console.error("Failed to generate contract agreement PDF:", error);
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
