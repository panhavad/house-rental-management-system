import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { RoomStatusBadge, ContractStatusBadge, PaymentStatusBadge } from "@/components/ui/Badge";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { deleteRoom, duplicateRoom, startContract, previewContract, endContract, terminateContract, addContractDocuments, deleteContractDocument } from "@/app/(app)/rooms/actions";
import { StartContractForm, TerminateContractForm, UploadDocumentForm } from "@/app/(app)/rooms/[id]/ContractForms";
import { Pencil, CheckCircle2, Users, QrCode, Copy } from "lucide-react";
import { getAppSettings, formatMoney } from "@/lib/currency";
import { ContractDocumentGrid } from "@/components/ui/ContractDocumentPreview";
import { generateQrDataUrl, roomUtilityReadingUrl } from "@/lib/qrcode";

export default async function RoomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const { id } = await params;

  const [room, settings] = await Promise.all([
    prisma.room.findFirst({
      where: { id, apartment: { workspaceId: user.workspaceId } },
      include: {
        apartment: true,
        facilities: { include: { facility: true } },
        contracts: { orderBy: { startDate: "desc" }, include: { documents: true } },
        utilityReadings: { orderBy: { month: "desc" }, take: 6 },
        payments: { orderBy: { month: "desc" }, take: 6 },
      },
    }),
    getAppSettings(user.workspaceId),
  ]);
  if (!room) notFound();

  const canWriteRoom = hasPermission(matrix, user.role, PERMISSIONS.ROOMS_WRITE);
  const canWriteContract = hasPermission(matrix, user.role, PERMISSIONS.CONTRACTS_WRITE);
  const activeContract = room.contracts.find((c) => c.status === "ACTIVE");
  const qrDataUrl = await generateQrDataUrl(await roomUtilityReadingUrl(room.id));

  return (
    <div>
      <PageHeader
        title={room.name}
        description={`${room.apartment.name} · ${room.type}`}
        breadcrumbs={[
          { label: "Apartments", href: "/apartments" },
          { label: room.apartment.name, href: `/apartments/${room.apartmentId}` },
          { label: room.name },
        ]}
        actions={
          canWriteRoom ? (
            <>
              <LinkButton href={`/rooms/${room.id}/edit`} variant="secondary" icon={Pencil}>
                Edit
              </LinkButton>
              <form action={duplicateRoom.bind(null, room.id)}>
                <Button type="submit" variant="secondary" icon={Copy}>
                  Duplicate
                </Button>
              </form>
              <DeleteButton
                action={deleteRoom.bind(null, room.id)}
                confirmMessage={`Delete room "${room.name}"? This cannot be undone.`}
              />
            </>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 flex flex-col gap-6">
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900">Room details</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  <RoomStatusBadge status={room.status} />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Rental fee</dt>
                <dd className="font-medium text-slate-900">{formatMoney(room.rentalFee, settings)}/mo</dd>
              </div>
              {room.size ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Size</dt>
                  <dd>{room.size} m²</dd>
                </div>
              ) : null}
              {room.floor ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Floor</dt>
                  <dd>{room.floor}</dd>
                </div>
              ) : null}
            </dl>

            {room.facilities.length > 0 ? (
              <div className="mt-4">
                <p className="mb-1.5 text-sm text-slate-500">Facilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {room.facilities.map((rf) => (
                    <span
                      key={rf.facilityId}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                    >
                      {rf.facility.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {room.notes ? <p className="mt-4 text-sm text-slate-600">{room.notes}</p> : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody className="text-center">
            <h2 className="mb-3 text-left font-semibold text-slate-900">Utility reading QR code</h2>
            <img
              src={qrDataUrl}
              alt={`QR code linking to the utility reading form for ${room.name}`}
              className="mx-auto h-40 w-40"
              width={160}
              height={160}
            />
            <p className="mt-3 text-xs text-slate-500">
              Print this and stick it in the room. Scanning it opens the reading form for {room.name}{" "}
              pre-selected.
            </p>
            <LinkButton
              href={`/utilities/new?roomId=${room.id}`}
              variant="secondary"
              icon={QrCode}
              className="mt-3"
            >
              Open reading form
            </LinkButton>
          </CardBody>
        </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardBody>
              <h2 className="mb-3 font-semibold text-slate-900">Contract</h2>
              {activeContract ? (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{activeContract.tenantName}</p>
                      <p className="text-sm text-slate-500">
                        {activeContract.startDate.toLocaleDateString()} –{" "}
                        {activeContract.endDate.toLocaleDateString()} ·{" "}
                        {formatMoney(activeContract.rentalFee, settings)}/mo
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                        <Users className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {activeContract.occupants} {activeContract.occupants === 1 ? "person" : "people"} staying
                      </p>
                    </div>
                    <ContractStatusBadge status={activeContract.status} />
                  </div>
                  {canWriteContract ? (
                    <div className="flex flex-wrap items-start gap-2">
                      <DeleteButton
                        action={endContract.bind(null, room.id, activeContract.id)}
                        confirmMessage="Mark this contract as ended?"
                        label="End contract"
                        icon={<CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      />
                      <TerminateContractForm action={terminateContract.bind(null, room.id, activeContract.id)} />
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <p className="mb-2 text-sm font-medium text-slate-700">Contract documents</p>
                    {activeContract.documents.length > 0 ? (
                      <ContractDocumentGrid
                        documents={activeContract.documents}
                        onDelete={
                          canWriteContract ? deleteContractDocument.bind(null, room.id) : undefined
                        }
                      />
                    ) : (
                      <p className="mb-2 text-sm text-slate-500">No documents attached yet.</p>
                    )}
                    {canWriteContract ? (
                      <div className="mt-2">
                        <UploadDocumentForm
                          action={addContractDocuments.bind(null, room.id, activeContract.id)}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : canWriteContract ? (
                <StartContractForm action={startContract.bind(null, room.id)} previewAction={previewContract.bind(null, room.id)} />
              ) : (
                <p className="text-sm text-slate-500">No active contract.</p>
              )}
            </CardBody>
          </Card>

          {room.contracts.length > 0 ? (
            <Card>
              <CardBody>
                <h2 className="mb-3 font-semibold text-slate-900">Contract history</h2>
                <ul className="divide-y divide-slate-100">
                  {room.contracts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="text-slate-700">
                        {c.tenantName} ({c.startDate.toLocaleDateString()} – {c.endDate.toLocaleDateString()})
                        {c.documents.length === 1 ? (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              href={c.documents[0].url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-500 underline hover:text-slate-700"
                            >
                              View document
                            </a>
                          </>
                        ) : c.documents.length > 1 ? (
                          <span className="text-slate-400"> · {c.documents.length} documents</span>
                        ) : null}
                      </span>
                      <ContractStatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent utility readings</h2>
                <Link href="/utilities" className="text-sm text-slate-500 hover:underline">
                  View all
                </Link>
              </div>
              {room.utilityReadings.length === 0 ? (
                <p className="text-sm text-slate-500">No utility readings yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {room.utilityReadings.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="text-slate-700">{u.month}</span>
                      <span className="text-slate-500">
                        Water {u.waterUsage} · Electricity {u.electricityUsage} ·{" "}
                        {formatMoney(u.totalCost, settings)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent payments</h2>
                <Link href="/payments" className="text-sm text-slate-500 hover:underline">
                  View all
                </Link>
              </div>
              {room.payments.length === 0 ? (
                <p className="text-sm text-slate-500">No payments yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {room.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-4 py-2 text-sm">
                      <span className="text-slate-700">
                        {p.month} · {formatMoney(p.totalAmount, settings)}
                      </span>
                      <PaymentStatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
