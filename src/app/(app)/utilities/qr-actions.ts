"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { buildRoomUtilityReadingUrl, generateQrPngBytes, getRequestOrigin } from "@/lib/qrcode";
import { generateRoomQrSheetPdf, type RoomQrCard } from "@/lib/room-qr-sheet-pdf";
import { getActiveLanguage } from "@/lib/language";

/** Guard against someone exporting an entire portfolio in one click — the PDF (and the QR rendering) would be huge. */
const MAX_ROOMS = 300;

export type RoomQrSheetResult = { pdfBase64: string; filename: string } | { error: string };

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "rooms"
  );
}

/**
 * Renders an A4, print-ready PDF of utility-reading QR codes for the rooms
 * currently in view on the Utilities page — the whole workspace, one apartment,
 * or a single room, matching the page's own `apartmentId` / `roomId` filters.
 */
export async function prepareRoomQrSheet(filters: {
  apartmentId?: string;
  roomId?: string;
}): Promise<RoomQrSheetResult> {
  const user = await requirePermission(PERMISSIONS.UTILITIES_WRITE);
  const { apartmentId, roomId } = filters;

  const rooms = await prisma.room.findMany({
    where: {
      apartment: { workspaceId: user.workspaceId },
      // A room filter is already more specific than its apartment.
      ...(roomId ? { id: roomId } : apartmentId ? { apartmentId } : {}),
    },
    orderBy: [{ apartment: { name: "asc" } }, { name: "asc" }],
    select: { id: true, name: true, apartment: { select: { name: true, address: true } } },
  });

  if (rooms.length === 0) {
    return { error: "No rooms match the current filter, so there's nothing to export." };
  }
  if (rooms.length > MAX_ROOMS) {
    return {
      error: `That's ${rooms.length} rooms — too many for one export. Filter to an apartment first (max ${MAX_ROOMS}).`,
    };
  }

  try {
    const [origin, language] = await Promise.all([getRequestOrigin(), getActiveLanguage()]);
    const cards: RoomQrCard[] = await Promise.all(
      rooms.map(async (room) => ({
        apartmentName: room.apartment.name,
        roomName: room.name,
        address: room.apartment.address,
        qrPngBytes: await generateQrPngBytes(buildRoomUtilityReadingUrl(origin, room.id)),
      }))
    );

    const scopeLabel = roomId
      ? `${rooms[0].apartment.name} · ${rooms[0].name}`
      : apartmentId
        ? `${rooms[0].apartment.name} · ${rooms.length} room${rooms.length === 1 ? "" : "s"}`
        : `All apartments · ${rooms.length} rooms`;

    const pdfBytes = await generateRoomQrSheetPdf({
      workspaceName: user.workspaceName ?? "RentalHRM",
      scopeLabel,
      cards,
      generatedAt: new Date(),
      locale: language.locale,
      translations: language.translations,
    });

    const scopeSlug = roomId
      ? slugify(`${rooms[0].apartment.name}-${rooms[0].name}`)
      : apartmentId
        ? slugify(rooms[0].apartment.name)
        : "all-rooms";

    return {
      pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      filename: `reading-qr-codes-${scopeSlug}.pdf`,
    };
  } catch (error) {
    console.error("Failed to generate room QR code sheet:", error);
    return { error: "Couldn't generate the QR code sheet. Please try again." };
  }
}
