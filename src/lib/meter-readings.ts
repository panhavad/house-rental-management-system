import { prisma } from "@/lib/prisma";

export type MeterDefaults = { water: number; electricity: number };

/**
 * The room's most recent utility reading's "current" values — the natural
 * continuation point for whatever comes next (a new reading, or a new
 * contract's move-in meter values). Null if the room has no reading history yet.
 */
export async function getLatestMeterReading(roomId: string): Promise<MeterDefaults | null> {
  const reading = await prisma.utilityReading.findFirst({
    where: { roomId },
    orderBy: { month: "desc" },
  });
  if (!reading) return null;
  return { water: reading.waterCurrent, electricity: reading.electricityCurrent };
}

/**
 * Best available "previous reading" defaults for recording a new utility
 * reading against this room: the latest historical reading if one exists
 * (the normal case — the physical meter just keeps running), else the
 * room's active contract's move-in meter values (covers the very first
 * reading of a new tenancy, before any reading has been recorded), else 0
 * for a room with no history at all.
 */
export async function getPreviousReadingDefaults(roomId: string): Promise<MeterDefaults> {
  const latest = await getLatestMeterReading(roomId);
  if (latest) return latest;

  const activeContract = await prisma.contract.findFirst({
    where: { roomId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });
  if (activeContract) {
    return { water: activeContract.waterMeterStart, electricity: activeContract.electricityMeterStart };
  }

  return { water: 0, electricity: 0 };
}
