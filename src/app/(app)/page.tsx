import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import Link from "next/link";
import {
  Building2,
  DoorOpen,
  Users,
  Receipt,
  LucideIcon,
  AlertTriangle,
  Droplets,
  FileClock,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { getAttentionSummary, AttentionItem } from "@/lib/attention";

function StatCard({
  label,
  value,
  href,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  href?: string;
  icon: LucideIcon;
}) {
  const content = (
    <Card className="transition-shadow hover:shadow-md">
      <CardBody className="p-3 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
          <Icon className="h-4 w-4 shrink-0 text-slate-400 sm:h-5 sm:w-5" aria-hidden="true" />
        </div>
        <p className="mt-1.5 text-xl font-semibold text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
      </CardBody>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function AttentionGroup({
  title,
  icon: Icon,
  tone,
  count,
  items,
}: {
  title: string;
  icon: LucideIcon;
  tone: "red" | "amber" | "sky";
  count: number;
  items: AttentionItem[];
}) {
  const toneClasses = {
    red: "text-red-600 bg-red-50",
    amber: "text-amber-600 bg-amber-50",
    sky: "text-sky-600 bg-sky-50",
  }[tone];

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${toneClasses}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <h3 className="font-medium text-slate-900">{title}</h3>
        <span className="text-sm text-slate-400">({count})</span>
      </div>
      {items.length === 0 ? (
        <p className="pl-9 text-sm text-slate-400">Nothing to do here.</p>
      ) : (
        <ul className="space-y-1 pl-9">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <Link href={item.href} className="text-slate-700 hover:underline">
                {item.label}
              </Link>
              <span className="text-slate-400"> — {item.detail}</span>
            </li>
          ))}
          {count > items.length ? (
            <li className="text-xs text-slate-400">+ {count - items.length} more</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireWorkspaceUser();
  const workspaceId = user.workspaceId;
  const [
    apartmentCount,
    roomCounts,
    occupantsResult,
    pendingPayments,
    overduePayments,
    recentActivity,
    attention,
    workspace,
  ] = await Promise.all([
    prisma.apartment.count({ where: { workspaceId } }),
    prisma.room.groupBy({ by: ["status"], where: { apartment: { workspaceId } }, _count: { status: true } }),
    prisma.contract.aggregate({
      where: { status: "ACTIVE", room: { apartment: { workspaceId } } },
      _sum: { occupants: true },
    }),
    prisma.payment.count({ where: { status: "PENDING", room: { apartment: { workspaceId } } } }),
    prisma.payment.count({ where: { status: "OVERDUE", room: { apartment: { workspaceId } } } }),
    prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { performedBy: { select: { name: true } } },
    }),
    getAttentionSummary(workspaceId),
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { onboardingCompletedAt: true } }),
  ]);

  const totalRooms = roomCounts.reduce((sum, r) => sum + r._count.status, 0);
  const occupiedRooms = roomCounts.find((r) => r.status === "OCCUPIED")?._count.status ?? 0;
  const peopleStaying = occupantsResult._sum.occupants ?? 0;
  const showSetupBanner = user.role === "ADMIN" && !workspace?.onboardingCompletedAt;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your rental properties" />

      {showSetupBanner ? (
        <Card className="mb-6 border-slate-900 bg-slate-900">
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                <Rocket className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-medium text-white">Your workspace setup isn&apos;t finished yet</p>
                <p className="text-sm text-slate-300">
                  Finish the quick setup wizard to add your currency, first apartment/room, and utility rates.
                </p>
              </div>
            </div>
            <LinkButton href="/setup" icon={ArrowRight}>
              Continue setup
            </LinkButton>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Apartments" value={apartmentCount} href="/apartments" icon={Building2} />
        <StatCard
          label="Rooms occupied"
          value={`${occupiedRooms}/${totalRooms}`}
          href="/apartments"
          icon={DoorOpen}
        />
        <StatCard label="People staying" value={peopleStaying} href="/apartments" icon={Users} />
        <StatCard
          label="Pending / overdue payments"
          value={`${pendingPayments} / ${overduePayments}`}
          href="/payments"
          icon={Receipt}
        />
      </div>

      <div id="needs-attention" className="mt-8 scroll-mt-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Needs attention</h2>
        {attention.totalCount === 0 ? (
          <Card>
            <p className="p-5 text-sm text-slate-500">All caught up — nothing needs action right now.</p>
          </Card>
        ) : (
          <Card>
            <div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-3">
              <AttentionGroup
                title="Overdue payments"
                icon={AlertTriangle}
                tone="red"
                count={attention.overdueCount}
                items={attention.overduePayments}
              />
              <AttentionGroup
                title="Missing this month's reading"
                icon={Droplets}
                tone="sky"
                count={attention.missingReadingsCount}
                items={attention.missingReadings}
              />
              <AttentionGroup
                title="Contracts expiring soon"
                icon={FileClock}
                tone="amber"
                count={attention.expiringContractsCount}
                items={attention.expiringContracts}
              />
            </div>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Recent activity</h2>
        <Card>
          <ul className="divide-y divide-slate-100">
            {recentActivity.length === 0 ? (
              <li className="p-5 text-sm text-slate-500">No activity yet.</li>
            ) : (
              recentActivity.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                  <span className="text-slate-700">{log.description}</span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {log.performedBy?.name ?? "System"} · {log.createdAt.toLocaleString()}
                  </span>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
