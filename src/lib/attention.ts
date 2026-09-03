import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { currentMonth } from "@/lib/dates";

export type AttentionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
};

export type AttentionSummary = {
  overduePayments: AttentionItem[];
  overdueCount: number;
  missingReadings: AttentionItem[];
  missingReadingsCount: number;
  expiringContracts: AttentionItem[];
  expiringContractsCount: number;
  totalCount: number;
};

const EXPIRING_WINDOW_DAYS = 30;

/**
 * Gathers everything that needs a human's attention right now: overdue
 * payments, rooms missing this month's utility reading, and contracts expiring
 * soon — scoped to one workspace. Cached per request so the notification card
 * and dashboard reuse the same queries.
 */
export const getAttentionSummary = cache(async (workspaceId: string): Promise<AttentionSummary> => {
  const month = currentMonth();
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const apartmentFilter = { apartment: { workspaceId } };

  const [overdue, missingRooms, expiring] = await Promise.all([
    prisma.payment.findMany({
      where: { status: "OVERDUE", room: apartmentFilter },
      orderBy: { dueDate: "asc" },
      include: { room: { include: { apartment: true } } },
    }),
    prisma.room.findMany({
      where: { status: "OCCUPIED", utilityReadings: { none: { month } }, ...apartmentFilter },
      include: { apartment: true },
      orderBy: { name: "asc" },
    }),
    prisma.contract.findMany({
      where: { status: "ACTIVE", endDate: { gte: now, lte: soon }, room: apartmentFilter },
      orderBy: { endDate: "asc" },
      include: { room: { include: { apartment: true } } },
    }),
  ]);

  return {
    overduePayments: overdue.map((p) => ({
      id: p.id,
      label: `${p.room.apartment.name} · ${p.room.name}`,
      detail: `${p.month} payment overdue`,
      href: "/payments?status=OVERDUE",
    })),
    overdueCount: overdue.length,
    missingReadings: missingRooms.map((r) => ({
      id: r.id,
      label: `${r.apartment.name} · ${r.name}`,
      detail: `No reading for ${month} yet`,
      href: `/utilities/new?roomId=${r.id}`,
    })),
    missingReadingsCount: missingRooms.length,
    expiringContracts: expiring.map((c) => ({
      id: c.id,
      label: `${c.room.apartment.name} · ${c.room.name}`,
      detail: `${c.tenantName}'s contract ends ${c.endDate.toISOString().slice(0, 10)}`,
      href: `/rooms/${c.roomId}`,
    })),
    expiringContractsCount: expiring.length,
    totalCount: overdue.length + missingRooms.length + expiring.length,
  };
});
