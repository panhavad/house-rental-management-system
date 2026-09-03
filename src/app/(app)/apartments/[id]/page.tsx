import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";
import { RoomStatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { CardLink } from "@/components/ui/StatusLink";
import { deleteApartment } from "@/app/(app)/apartments/actions";
import { duplicateRoom } from "@/app/(app)/rooms/actions";
import { DoorOpen, Pencil, MapPin, Users, Copy } from "lucide-react";
import { getAppSettings, formatMoney } from "@/lib/currency";

export default async function ApartmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const { id } = await params;

  const [apartment, settings] = await Promise.all([
    prisma.apartment.findFirst({
      where: { id, workspaceId: user.workspaceId },
      include: {
        rooms: {
          orderBy: { name: "asc" },
          include: { contracts: { where: { status: "ACTIVE" }, select: { occupants: true } } },
        },
      },
    }),
    getAppSettings(user.workspaceId),
  ]);
  if (!apartment) notFound();

  const canWrite = hasPermission(matrix, user.role, PERMISSIONS.APARTMENTS_WRITE);
  const canWriteRooms = hasPermission(matrix, user.role, PERMISSIONS.ROOMS_WRITE);
  const peopleStaying = apartment.rooms.reduce(
    (sum, room) => sum + room.contracts.reduce((s, c) => s + c.occupants, 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={apartment.name}
        description={apartment.address ?? undefined}
        breadcrumbs={[{ label: "Apartments", href: "/apartments" }, { label: apartment.name }]}
        actions={
          canWrite ? (
            <>
              <LinkButton href={`/apartments/${apartment.id}/rooms/new`} variant="secondary" icon={DoorOpen}>
                Add room
              </LinkButton>
              <LinkButton href={`/apartments/${apartment.id}/edit`} variant="secondary" icon={Pencil}>
                Edit
              </LinkButton>
              <DeleteButton
                action={deleteApartment.bind(null, apartment.id)}
                confirmMessage={`Delete apartment "${apartment.name}" and all of its rooms? This cannot be undone.`}
              />
            </>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          {peopleStaying} {peopleStaying === 1 ? "person" : "people"} currently staying
        </span>
        {apartment.mapUrl ? (
          <a
            href={apartment.mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-slate-600 underline hover:text-slate-900"
          >
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            View on map
          </a>
        ) : null}
      </div>

      {apartment.description ? <p className="mb-6 text-sm text-slate-600">{apartment.description}</p> : null}

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Rooms</h2>
      {apartment.rooms.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">No rooms yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apartment.rooms.map((room) => (
            <Card key={room.id} className="h-full transition-shadow hover:shadow-md">
              <CardBody>
                <CardLink href={`/rooms/${room.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 hover:underline">{room.name}</h3>
                    <RoomStatusBadge status={room.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{room.type}</p>
                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {formatMoney(room.rentalFee, settings)}/mo
                  </p>
                </CardLink>
                {canWriteRooms ? (
                  <form action={duplicateRoom.bind(null, room.id)} className="mt-3">
                    <SubmitStatusButton
                      type="submit"
                      icon={<Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      Duplicate
                    </SubmitStatusButton>
                  </form>
                ) : null}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
