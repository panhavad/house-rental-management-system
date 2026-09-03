import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";
import { Input } from "@/components/ui/Field";
import { FilterBar, FilterSelect, FilterMonth, ApartmentRoomFilter } from "@/components/ui/FilterBar";
import { PaymentStatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { StatusLink } from "@/components/ui/StatusLink";
import { MarkPaidForm } from "@/app/(app)/payments/MarkPaidForm";
import { InvoiceButtons } from "@/app/(app)/payments/InvoiceButtons";
import { generateMissingInvoices, markPaid, markOverdue } from "@/app/(app)/payments/actions";
import { currentMonth } from "@/lib/dates";
import { FileText, AlertTriangle } from "lucide-react";
import { resolvePage, resolvePageSize, paginationSkipTake, PAGE_SIZE_COOKIE } from "@/lib/pagination";

import { getAppSettings, formatMoney } from "@/lib/currency";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    apartmentId?: string;
    roomId?: string;
    month?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const { status, apartmentId, roomId, month, page: pageParam, pageSize: pageSizeParam } = await searchParams;
  const canWrite = hasPermission(matrix, user.role, PERMISSIONS.PAYMENTS_WRITE);
  const cookieStore = await cookies();

  const page = resolvePage(pageParam);
  const pageSize = resolvePageSize(pageSizeParam, cookieStore.get(PAGE_SIZE_COOKIE)?.value);
  const where = {
    status: status ? (status as "PENDING" | "PAID" | "OVERDUE") : undefined,
    roomId: roomId || undefined,
    month: month || undefined,
    room: {
      apartment: { workspaceId: user.workspaceId },
      // A room filter is already more specific than its apartment.
      ...(!roomId && apartmentId ? { apartmentId } : {}),
    },
  };

  const [payments, totalCount, apartments, settings] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      include: { room: { include: { apartment: true } } },
      ...paginationSkipTake(page, pageSize),
    }),
    prisma.payment.count({ where }),
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
        title="Payments"
        description="Rent + utility invoices, filterable by status/room/month"
        breadcrumbs={[{ label: "Payments" }]}
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
        <FilterBar
          values={{ status, apartmentId, roomId, month, pageSize: pageSizeParam }}
          clearableKeys={["status", "apartmentId", "roomId", "month"]}
          className="mb-0"
        >
          <FilterSelect name="status" label="Filter by status" value={status ?? ""} className="w-full sm:w-40">
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </FilterSelect>
          <ApartmentRoomFilter
            apartments={apartments}
            apartmentId={apartmentId ?? ""}
            roomId={roomId ?? ""}
            className="w-full sm:w-64"
          />
          <FilterMonth name="month" label="Filter by month" value={month ?? ""} className="w-full sm:w-40" />
        </FilterBar>

        {canWrite ? (
          <form action={generateMissingInvoices} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input name="month" type="month" defaultValue={currentMonth()} className="w-full sm:w-40" />
            <Button type="submit" variant="secondary" icon={FileText}>
              Generate missing invoices
            </Button>
          </form>
        ) : null}
      </div>

      {payments.length === 0 ? (
        <Card>
          <p className="p-5 text-sm text-slate-500">No payments found.</p>
        </Card>
      ) : (
        <>
          {/* Mobile: stacked cards, no horizontal scrolling needed. */}
          <div className="flex flex-col gap-3 md:hidden">
            {payments.map((p) => (
              <Card key={p.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <StatusLink
                        href={`/rooms/${p.roomId}`}
                        className="inline-flex items-center gap-1.5 font-medium text-slate-900 hover:underline"
                        spinnerClassName="h-3.5 w-3.5"
                      >
                        {p.room.apartment.name} · {p.room.name}
                      </StatusLink>
                      <p className="text-xs text-slate-400">{p.month}</p>
                    </div>
                    <PaymentStatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-slate-400">Rent</p>
                      <p className="text-slate-700">{formatMoney(p.rentalFee, settings)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Utilities</p>
                      <p className="text-slate-700">{formatMoney(p.utilityAmount, settings)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Total</p>
                      <p className="font-semibold text-slate-900">{formatMoney(p.totalAmount, settings)}</p>
                    </div>
                  </div>
                  {canWrite ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {p.status !== "PAID" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <MarkPaidForm action={markPaid.bind(null, p.id)} defaultAmount={p.totalAmount} />
                          {p.status !== "OVERDUE" ? (
                            <form action={markOverdue.bind(null, p.id)}>
                              <SubmitStatusButton
                                type="submit"
                                icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400"
                              >
                                Mark overdue
                              </SubmitStatusButton>
                            </form>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Paid {p.paidAt?.toLocaleDateString()} {p.method ? `via ${p.method}` : ""}
                        </span>
                      )}
                    </div>
                  ) : null}
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <InvoiceButtons paymentId={p.id} roomLabel={`${p.room.apartment.name}-${p.room.name}`} month={p.month} />
                  </div>
                </div>
              </Card>
            ))}
            <Card>
              <Pagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                searchParams={{ status, apartmentId, roomId, month }}
              />
            </Card>
          </div>

          {/* Desktop: full table. */}
          <Card className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Room</th>
                    <th className="px-5 py-3 font-medium">Month</th>
                    <th className="px-5 py-3 font-medium">Rent</th>
                    <th className="px-5 py-3 font-medium">Utilities</th>
                    <th className="px-5 py-3 font-medium">Total</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Invoice</th>
                    {canWrite ? <th className="px-5 py-3 font-medium">Actions</th> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-3">
                        <StatusLink
                          href={`/rooms/${p.roomId}`}
                          className="inline-flex items-center gap-1.5 text-slate-700 hover:underline"
                          spinnerClassName="h-3.5 w-3.5"
                        >
                          {p.room.apartment.name} · {p.room.name}
                        </StatusLink>
                      </td>
                      <td className="px-5 py-3 text-slate-600">{p.month}</td>
                      <td className="px-5 py-3 text-slate-600">{formatMoney(p.rentalFee, settings)}</td>
                      <td className="px-5 py-3 text-slate-600">{formatMoney(p.utilityAmount, settings)}</td>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {formatMoney(p.totalAmount, settings)}
                      </td>
                      <td className="px-5 py-3">
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="px-5 py-3">
                        <InvoiceButtons paymentId={p.id} roomLabel={`${p.room.apartment.name}-${p.room.name}`} month={p.month} />
                      </td>
                      {canWrite ? (
                        <td className="px-5 py-3">
                          {p.status !== "PAID" ? (
                            <div className="flex items-center gap-2">
                              <MarkPaidForm action={markPaid.bind(null, p.id)} defaultAmount={p.totalAmount} />
                              {p.status !== "OVERDUE" ? (
                                <form action={markOverdue.bind(null, p.id)}>
                                  <SubmitStatusButton
                                    type="submit"
                                    icon={<AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                                    className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-400"
                                  >
                                    Mark overdue
                                  </SubmitStatusButton>
                                </form>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">
                              Paid {p.paidAt?.toLocaleDateString()} {p.method ? `via ${p.method}` : ""}
                            </span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              searchParams={{ status, apartmentId, roomId, month }}
            />
          </Card>
        </>
      )}
    </div>
  );
}
