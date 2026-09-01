import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Plus, Building2, Users } from "lucide-react";

export default async function SuperAdminDashboardPage() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { users: true, apartments: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every isolated workspace on this platform. Each one has its own users, apartments, and data."
        actions={
          <LinkButton href="/super-admin/workspaces/new" icon={Plus}>
            New workspace
          </LinkButton>
        }
      />

      {workspaces.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">No workspaces yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link key={workspace.id} href={`/super-admin/workspaces/${workspace.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardBody>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{workspace.name}</h3>
                    <Badge tone={workspace.isActive ? "green" : "slate"}>
                      {workspace.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">/{workspace.slug}</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {workspace._count.users}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                      {workspace._count.apartments}
                    </span>
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
