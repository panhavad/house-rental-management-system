import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button, LinkButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Plus, Building2, Users, FlaskConical, Trash2 } from "lucide-react";
import { findDemoWorkspace, DEMO_ACCOUNTS, DEMO_ADMIN_PASSWORD } from "@/lib/demo-data";
import { loadDemoDataAction, unloadDemoDataAction } from "@/app/super-admin/actions";

export default async function SuperAdminDashboardPage() {
  const [workspaces, demoWorkspace] = await Promise.all([
    prisma.workspace.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { users: true, apartments: true } },
      },
    }),
    findDemoWorkspace(),
  ]);

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

      <Card className="mb-6">
        <CardBody>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                <FlaskConical className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                Demo data
              </h3>
              {demoWorkspace ? (
                <p className="mt-1 text-sm text-slate-500">
                  Loaded — 2 fully furnished apartments with contracts, utilities and payments in every
                  status. Sign in with workspace <span className="font-mono font-medium">{demoWorkspace.slug}</span>{" "}
                  and any account below. Loaded {demoWorkspace.createdAt.toLocaleString()}.
                </p>
              ) : (
                <p className="mt-1 text-sm text-slate-500">
                  Load a self-contained demo workspace (2 apartments, contracts, utility readings, due
                  payments, and a login for every role) to explore or showcase every feature. This never
                  affects any real workspace or user.
                </p>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {demoWorkspace ? (
                <>
                  <form action={loadDemoDataAction}>
                    <Button type="submit" variant="secondary" icon={FlaskConical}>
                      Reload demo data
                    </Button>
                  </form>
                  <form action={unloadDemoDataAction}>
                    <Button type="submit" variant="danger" icon={Trash2}>
                      Unload demo data
                    </Button>
                  </form>
                </>
              ) : (
                <form action={loadDemoDataAction}>
                  <Button type="submit" icon={FlaskConical}>
                    Load demo data
                  </Button>
                </form>
              )}
            </div>
          </div>

          {demoWorkspace ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">Demo login accounts (one per role)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate-500">
                    <tr>
                      <th className="py-1 pr-4 font-medium">Role</th>
                      <th className="py-1 pr-4 font-medium">Email</th>
                      <th className="py-1 font-medium">Password</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DEMO_ACCOUNTS.map((account) => (
                      <tr key={account.email}>
                        <td className="py-1 pr-4 text-slate-700">{account.roleLabel}</td>
                        <td className="py-1 pr-4 font-mono text-slate-600">{account.email}</td>
                        <td className="py-1 font-mono text-slate-600">{DEMO_ADMIN_PASSWORD}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                href={`/super-admin/workspaces/${demoWorkspace.id}`}
                className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
              >
                View demo workspace →
              </Link>
            </div>
          ) : null}
        </CardBody>
      </Card>

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
                    <div className="flex shrink-0 gap-1.5">
                      {workspace.isDemo ? <Badge tone="blue">Demo</Badge> : null}
                      <Badge tone={workspace.isActive ? "green" : "slate"}>
                        {workspace.isActive ? "Active" : "Disabled"}
                      </Badge>
                    </div>
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
