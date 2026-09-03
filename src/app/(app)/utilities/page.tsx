import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { FilterBar, ApartmentRoomFilter } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { StatusLink } from "@/components/ui/StatusLink";
import { Droplets, Zap } from "lucide-react";
import { getAppSettings, formatMoney } from "@/lib/currency";
import { resolvePage, resolvePageSize, paginationSkipTake, PAGE_SIZE_COOKIE } from "@/lib/pagination";
import { QrScanButton } from "@/components/ui/QrScanButton";

export default async function UtilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ apartmentId?: string; roomId?: string; page?: string; pageSize?: string }>;
}) {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const { apartmentId, roomId, page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const cookieStore = await cookies();

  const page = resolvePage(pageParam);
  const pageSize = resolvePageSize(pageSizeParam, cookieStore.get(PAGE_SIZE_COOKIE)?.value);
  const where = {
    room: {
      apartment: { workspaceId: user.workspaceId },
      // A room filter is already more specific than its apartment.
      ...(!roomId && apartmentId ? { apartmentId } : {}),
    },
    ...(roomId ? { roomId } : {}),
  };

  const [readings, totalCount, apartments, settings] = await Promise.all([
    prisma.utilityReading.findMany({
      where,
      orderBy: { month: "desc" },
      include: { room: { include: { apartment: true } } },
      ...paginationSkipTake(page, pageSize),
    }),
    prisma.utilityReading.count({ where }),
    prisma.apartment.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, rooms: { orderBy: { name: "asc" }, select: { id: true, name: true } } },
    }),
    getAppSettings(user.workspaceId),
  ]);

  return (
    <div>
      <PageHeader
        title="Utilities"
        description="Monthly water & electricity meter readings"
        breadcrumbs={[{ label: "Utilities" }]}
        actions={
          hasPermission(matrix, user.role, PERMISSIONS.UTILITIES_WRITE) ? (
            <>
              <QrScanButton />
              <LinkButton href="/utilities/new" icon={Droplets}>
                Record reading
              </LinkButton>
            </>
          ) : undefined
        }
      />

      <FilterBar
        values={{ apartmentId, roomId, pageSize: pageSizeParam }}
        clearableKeys={["apartmentId", "roomId"]}
      >
        <ApartmentRoomFilter
          apartments={apartments}
          apartmentId={apartmentId ?? ""}
          roomId={roomId ?? ""}
          className="w-full sm:w-72"
        />
      </FilterBar>

      {readings.length === 0 ? (
        <Card>
          <p className="p-5 text-sm text-slate-500">No utility readings yet.</p>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards, no horizontal scrolling needed. */}
          <div className="flex flex-col gap-3 md:hidden">
            {readings.map((r) => (
              <Card key={r.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <StatusLink
                      href={`/rooms/${r.roomId}`}
                      className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
                      spinnerClassName="h-3.5 w-3.5"
                    >
                      {r.room.apartment.name} · {r.room.name}
                    </StatusLink>
                    <span className="shrink-0 text-xs text-slate-400">{r.month}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-1.5">
                      <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden="true" />
                      <div>
                        <p className="text-slate-600">{r.waterUsage} units</p>
                        <p className="text-xs text-slate-400">{formatMoney(r.waterCost, settings)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      <div>
                        <p className="text-slate-600">{r.electricityUsage} units</p>
                        <p className="text-xs text-slate-400">{formatMoney(r.electricityCost, settings)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Total cost</span>
                    <span className="font-semibold text-slate-900">{formatMoney(r.totalCost, settings)}</span>
                  </div>
                </div>
              </Card>
            ))}
            <Card>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                searchParams={{ apartmentId, roomId }}
              />
            </Card>
          </div>

          {/* Desktop: full table. */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Room</th>
                    <th className="px-5 py-3 font-medium">Month</th>
                    <th className="px-5 py-3 font-medium">Water</th>
                    <th className="px-5 py-3 font-medium">Electricity</th>
                    <th className="px-5 py-3 font-medium">Total cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readings.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3">
                        <StatusLink
                          href={`/rooms/${r.roomId}`}
                          className="inline-flex items-center gap-1.5 text-slate-700 hover:underline"
                          spinnerClassName="h-3.5 w-3.5"
                        >
                          {r.room.apartment.name} · {r.room.name}
                        </StatusLink>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{r.month}</td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.waterUsage} units ({formatMoney(r.waterCost, settings)})
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        {r.electricityUsage} units ({formatMoney(r.electricityCost, settings)})
                      </td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {formatMoney(r.totalCost, settings)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              searchParams={{ apartmentId, roomId }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
