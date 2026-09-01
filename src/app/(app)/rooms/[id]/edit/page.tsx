import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoomForm } from "@/app/(app)/rooms/RoomForm";
import { updateRoom } from "@/app/(app)/rooms/actions";

export default async function EditRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);
  const { id } = await params;

  const [room, facilities] = await Promise.all([
    prisma.room.findFirst({
      where: { id, apartment: { workspaceId: user.workspaceId } },
      include: { facilities: true, apartment: true },
    }),
    prisma.facility.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
  ]);
  if (!room) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${room.name}`}
        breadcrumbs={[
          { label: "Apartments", href: "/apartments" },
          { label: room.apartment.name, href: `/apartments/${room.apartmentId}` },
          { label: room.name, href: `/rooms/${room.id}` },
          { label: "Edit" },
        ]}
      />
      <RoomForm
        action={updateRoom.bind(null, room.id)}
        facilities={facilities}
        room={room}
        selectedFacilityIds={room.facilities.map((f) => f.facilityId)}
        cancelHref={`/rooms/${room.id}`}
      />
    </div>
  );
}
