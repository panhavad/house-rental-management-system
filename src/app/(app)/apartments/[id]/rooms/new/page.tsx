import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoomForm } from "@/app/(app)/rooms/RoomForm";
import { createRoom } from "@/app/(app)/rooms/actions";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";

export default async function NewRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.ROOMS_WRITE);
  const { id } = await params;

  const [apartment, facilities] = await Promise.all([
    prisma.apartment.findFirst({ where: { id, workspaceId: user.workspaceId } }),
    prisma.facility.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { name: "asc" } }),
  ]);

  if (!apartment) notFound();

  return (
    <div>
      <PageHeader
        title={`Add Room to ${apartment.name}`}
        breadcrumbs={[
          { label: "Apartments", href: "/apartments" },
          { label: apartment.name, href: `/apartments/${apartment.id}` },
          { label: "Add room" },
        ]}
      />
      <RoomForm
        action={createRoom}
        apartmentId={apartment.id}
        facilities={facilities}
        cancelHref={`/apartments/${apartment.id}`}
      />
    </div>
  );
}
