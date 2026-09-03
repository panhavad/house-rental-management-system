import type { Workspace } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlug } from "@/lib/workspace";
import { exportWorkspaceBackup } from "@/lib/backup";

/**
 * Deep-clones an entire workspace — every apartment, room, contract, payment,
 * utility reading/rate, facility, user and role permission — into a brand-new
 * workspace with fresh IDs throughout, so the copy can coexist with the
 * original without any collision. Named "<original> (copy)" (bumped to
 * "(copy) 2", "(copy) 3", ... if that name/URL is already taken). The old
 * activity log isn't copied over (it would describe the wrong workspace); a
 * single fresh entry noting the duplication is added instead.
 */
export async function duplicateWorkspace(
  sourceWorkspaceId: string
): Promise<{ workspace: Workspace; sourceName: string }> {
  const snapshot = await exportWorkspaceBackup(sourceWorkspaceId);

  const baseName = `${snapshot.workspace.name} (copy)`;
  const slug = await uniqueSlug(slugify(baseName));
  // uniqueSlug only guarantees a unique *slug* (appending -2, -3, ...); mirror
  // that into a matching display name so it reads as "Acme (copy) 2" instead
  // of silently reusing "Acme (copy)" for every duplicate.
  const suffixMatch = slug.match(/-(\d+)$/);
  const name = suffixMatch ? `${baseName} ${suffixMatch[1]}` : baseName;

  return prisma.$transaction(
    async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          isActive: snapshot.workspace.isActive,
          isDemo: false,
          onboardingCompletedAt: snapshot.workspace.onboardingCompletedAt,
        },
      });

      if (snapshot.appSetting) {
        await tx.appSetting.create({
          data: {
            workspaceId: workspace.id,
            currency: snapshot.appSetting.currency,
            exchangeRate: snapshot.appSetting.exchangeRate,
          },
        });
      }

      if (snapshot.contractTemplate) {
        await tx.contractTemplate.create({
          data: { workspaceId: workspace.id, content: snapshot.contractTemplate.content },
        });
      }

      if (snapshot.paymentMethods.length) {
        await tx.paymentMethod.createMany({
          data: snapshot.paymentMethods.map((pm) => ({
            workspaceId: workspace.id,
            label: pm.label,
            bankName: pm.bankName,
            accountName: pm.accountName,
            accountNumber: pm.accountNumber,
            qrImageUrl: pm.qrImageUrl,
            notes: pm.notes,
          })),
        });
      }

      if (snapshot.rolePermissions.length) {
        await tx.rolePermission.createMany({
          data: snapshot.rolePermissions.map((rp) => ({
            workspaceId: workspace.id,
            role: rp.role,
            permission: rp.permission,
            allowed: rp.allowed,
          })),
        });
      }

      for (const user of snapshot.users) {
        await tx.user.create({
          data: {
            workspaceId: workspace.id,
            name: user.name,
            email: user.email,
            passwordHash: user.passwordHash,
            role: user.role,
            isActive: user.isActive,
          },
        });
      }

      const facilityIdMap = new Map<string, string>();
      for (const facility of snapshot.facilities) {
        const created = await tx.facility.create({
          data: { workspaceId: workspace.id, name: facility.name, icon: facility.icon },
        });
        facilityIdMap.set(facility.id, created.id);
      }

      if (snapshot.utilityRates.length) {
        await tx.utilityRate.createMany({
          data: snapshot.utilityRates.map((rate) => ({
            workspaceId: workspace.id,
            type: rate.type,
            pricePerUnit: rate.pricePerUnit,
            effectiveFrom: rate.effectiveFrom,
          })),
        });
      }

      const apartmentIdMap = new Map<string, string>();
      for (const apartment of snapshot.apartments) {
        const created = await tx.apartment.create({
          data: {
            workspaceId: workspace.id,
            name: apartment.name,
            address: apartment.address,
            description: apartment.description,
            mapUrl: apartment.mapUrl,
          },
        });
        apartmentIdMap.set(apartment.id, created.id);
      }

      const roomIdMap = new Map<string, string>();
      for (const room of snapshot.rooms) {
        const newApartmentId = apartmentIdMap.get(room.apartmentId);
        if (!newApartmentId) continue;
        const created = await tx.room.create({
          data: {
            apartmentId: newApartmentId,
            name: room.name,
            size: room.size,
            type: room.type,
            floor: room.floor,
            floorPlanUrl: room.floorPlanUrl,
            rentalFee: room.rentalFee,
            status: room.status,
            notes: room.notes,
          },
        });
        roomIdMap.set(room.id, created.id);
      }

      const roomFacilityRows = snapshot.roomFacilities
        .map((rf) => {
          const roomId = roomIdMap.get(rf.roomId);
          const facilityId = facilityIdMap.get(rf.facilityId);
          return roomId && facilityId ? { roomId, facilityId } : null;
        })
        .filter((row): row is { roomId: string; facilityId: string } => row !== null);
      if (roomFacilityRows.length) {
        await tx.roomFacility.createMany({ data: roomFacilityRows });
      }

      const contractIdMap = new Map<string, string>();
      for (const contract of snapshot.contracts) {
        const newRoomId = roomIdMap.get(contract.roomId);
        if (!newRoomId) continue;
        const created = await tx.contract.create({
          data: {
            roomId: newRoomId,
            tenantName: contract.tenantName,
            tenantPhone: contract.tenantPhone,
            tenantEmail: contract.tenantEmail,
            tenantIdNumber: contract.tenantIdNumber,
            occupants: contract.occupants,
            rentalFee: contract.rentalFee,
            deposit: contract.deposit,
            waterMeterStart: contract.waterMeterStart,
            electricityMeterStart: contract.electricityMeterStart,
            startDate: contract.startDate,
            endDate: contract.endDate,
            status: contract.status,
            terminatedAt: contract.terminatedAt,
            terminationReason: contract.terminationReason,
            notes: contract.notes,
          },
        });
        contractIdMap.set(contract.id, created.id);
      }

      for (const doc of snapshot.contractDocuments) {
        const newContractId = contractIdMap.get(doc.contractId);
        if (!newContractId) continue;
        await tx.contractDocument.create({
          data: { contractId: newContractId, url: doc.url, thumbnailUrl: doc.thumbnailUrl, fileType: doc.fileType },
        });
      }

      const utilityReadingIdMap = new Map<string, string>();
      for (const reading of snapshot.utilityReadings) {
        const newRoomId = roomIdMap.get(reading.roomId);
        if (!newRoomId) continue;
        const created = await tx.utilityReading.create({
          data: {
            roomId: newRoomId,
            month: reading.month,
            waterPrevious: reading.waterPrevious,
            waterCurrent: reading.waterCurrent,
            waterUsage: reading.waterUsage,
            waterRate: reading.waterRate,
            waterCost: reading.waterCost,
            electricityPrevious: reading.electricityPrevious,
            electricityCurrent: reading.electricityCurrent,
            electricityUsage: reading.electricityUsage,
            electricityRate: reading.electricityRate,
            electricityCost: reading.electricityCost,
            totalCost: reading.totalCost,
          },
        });
        utilityReadingIdMap.set(reading.id, created.id);
      }

      for (const payment of snapshot.payments) {
        const newRoomId = roomIdMap.get(payment.roomId);
        if (!newRoomId) continue;
        await tx.payment.create({
          data: {
            roomId: newRoomId,
            contractId: payment.contractId ? (contractIdMap.get(payment.contractId) ?? null) : null,
            utilityReadingId: payment.utilityReadingId
              ? (utilityReadingIdMap.get(payment.utilityReadingId) ?? null)
              : null,
            month: payment.month,
            rentalFee: payment.rentalFee,
            utilityAmount: payment.utilityAmount,
            totalAmount: payment.totalAmount,
            status: payment.status,
            dueDate: payment.dueDate,
            paidAt: payment.paidAt,
            paidAmount: payment.paidAmount,
            method: payment.method,
            notes: payment.notes,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          workspaceId: workspace.id,
          entityType: "WORKSPACE",
          entityId: workspace.id,
          action: "WORKSPACE_DUPLICATED",
          description: `Workspace duplicated from "${snapshot.workspace.name}".`,
        },
      });

      return { workspace, sourceName: snapshot.workspace.name };
    },
    { timeout: 30_000, maxWait: 10_000 }
  );
}

export type DuplicateWorkspacesResult = {
  sourceId: string;
  sourceName: string;
  newWorkspaceId?: string;
  newName?: string;
  error?: string;
};

/** Duplicates several workspaces independently — one failure doesn't stop the rest. */
export async function duplicateWorkspaces(ids: string[]): Promise<DuplicateWorkspacesResult[]> {
  const results: DuplicateWorkspacesResult[] = [];
  for (const id of ids) {
    try {
      const { workspace, sourceName } = await duplicateWorkspace(id);
      results.push({ sourceId: id, sourceName, newWorkspaceId: workspace.id, newName: workspace.name });
    } catch (error) {
      results.push({ sourceId: id, sourceName: id, error: error instanceof Error ? error.message : "Unknown error." });
    }
  }
  return results;
}
