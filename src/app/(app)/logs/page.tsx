import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { FilterButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { resolvePage, resolvePageSize, paginationSkipTake, PAGE_SIZE_COOKIE } from "@/lib/pagination";

const ENTITY_TYPES = ["APARTMENT", "ROOM", "CONTRACT", "UTILITY", "PAYMENT", "FACILITY", "USER"];

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; roomId?: string; page?: string; pageSize?: string }>;
}) {
  const user = await requireWorkspaceUser();
  const { entityType, roomId, page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const cookieStore = await cookies();

  const page = resolvePage(pageParam);
  const pageSize = resolvePageSize(pageSizeParam, cookieStore.get(PAGE_SIZE_COOKIE)?.value);
  const where = {
    workspaceId: user.workspaceId,
    entityType: entityType || undefined,
    roomId: roomId || undefined,
  };

  const [logs, totalCount, rooms] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { performedBy: { select: { name: true } }, room: { include: { apartment: true } } },
      ...paginationSkipTake(page, pageSize),
    }),
    prisma.activityLog.count({ where }),
    prisma.room.findMany({
      where: { apartment: { workspaceId: user.workspaceId } },
      orderBy: { name: "asc" },
      include: { apartment: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Every create/update/delete and status change, audited"
        breadcrumbs={[{ label: "Activity log" }]}
      />

      <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
        <Select name="entityType" defaultValue={entityType ?? ""} className="w-48">
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Select name="roomId" defaultValue={roomId ?? ""} className="w-56">
          <option value="">All rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.apartment.name} · {room.name}
            </option>
          ))}
        </Select>
        <FilterButton />
      </form>

      <Card>
        {logs.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No activity found.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div>
                  <p className="text-slate-700">{log.description}</p>
                  {log.room ? (
                    <p className="text-xs text-slate-400">
                      {log.room.apartment.name} · {log.room.name}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {log.performedBy?.name ?? "System"} · {log.createdAt.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Pagination page={page} pageSize={pageSize} totalCount={totalCount} searchParams={{ entityType, roomId }} />
      </Card>
    </div>
  );
}
