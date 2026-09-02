import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { CollapsibleCard } from "@/components/ui/CollapsibleCard";
import { Button, LinkButton } from "@/components/ui/Button";
import { RestoreButton } from "@/components/ui/RestoreButton";
import { WorkspaceGrid } from "@/app/super-admin/WorkspaceGrid";
import { Plus, FlaskConical, Trash2, Download } from "lucide-react";
import { findDemoWorkspace, DEMO_ACCOUNTS, DEMO_ADMIN_PASSWORD } from "@/lib/demo-data";
import { loadDemoDataAction, unloadDemoDataAction } from "@/app/super-admin/actions";
import { restoreAnyWorkspaceBackupAction } from "@/app/super-admin/backup-actions";

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

  const workspaceSummaries = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    isActive: workspace.isActive,
    isDemo: workspace.isDemo,
    userCount: workspace._count.users,
    apartmentCount: workspace._count.apartments,
  }));

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every isolated workspace on this platform. Each one has its own users, apartments, and data."
        actions={
          <>
            <LinkButton href="/super-admin/workspaces/new" icon={Plus}>
              New workspace
            </LinkButton>
            <LinkButton href="/api/backup/export?scope=all" variant="secondary" icon={Download}>
              Backup
            </LinkButton>
            <RestoreButton
              action={restoreAnyWorkspaceBackupAction}
              confirmMessage={
                'Restore from "{filename}"? This will permanently replace all current data for every workspace contained in this backup. This cannot be undone.'
              }
            />
          </>
        }
      />

      <CollapsibleCard
        className="mb-6"
        icon={FlaskConical}
        title="Demo data"
        description={
          demoWorkspace ? (
            <>
              Loaded — 2 fully furnished apartments with contracts, utilities and payments in every status.
              Sign in with any account below (email + password only — no workspace to pick, this email isn&apos;t
              used anywhere else). Loaded {demoWorkspace.createdAt.toLocaleString()}.
            </>
          ) : (
            "Load a self-contained demo workspace (2 apartments, contracts, utility readings, due payments, " +
            "and a login for every role) to explore or showcase every feature. This never affects any real " +
            "workspace or user."
          )
        }
      >
        <div className="flex flex-wrap gap-2">
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
      </CollapsibleCard>

      <WorkspaceGrid workspaces={workspaceSummaries} />
    </div>
  );
}
