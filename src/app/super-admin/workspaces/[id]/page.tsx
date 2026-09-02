import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS } from "@/lib/rbac";
import { setWorkspaceActive, enterWorkspace, unloadDemoDataAction } from "@/app/super-admin/actions";
import { Ban, CheckCircle2, LogIn, Trash2 } from "lucide-react";

export default async function SuperAdminWorkspaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      users: { orderBy: { createdAt: "asc" } },
      _count: { select: { apartments: true } },
    },
  });
  if (!workspace) notFound();

  return (
    <div>
      <PageHeader
        title={workspace.name}
        description={`/${workspace.slug} · ${workspace._count.apartments} apartment(s)`}
        actions={
          <>
            {workspace.isDemo ? <Badge tone="blue">Demo</Badge> : null}
            {workspace.isActive ? (
              <form action={enterWorkspace.bind(null, workspace.id)}>
                <Button type="submit" icon={LogIn}>
                  Enter workspace
                </Button>
              </form>
            ) : null}
            {workspace.isDemo ? (
              <form action={unloadDemoDataAction}>
                <Button type="submit" variant="danger" icon={Trash2}>
                  Unload demo data
                </Button>
              </form>
            ) : (
              <form action={setWorkspaceActive.bind(null, workspace.id, !workspace.isActive)}>
                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium text-white ${
                    workspace.isActive ? "bg-red-600 hover:bg-red-500" : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {workspace.isActive ? (
                    <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  {workspace.isActive ? "Disable workspace" : "Enable workspace"}
                </button>
              </form>
            )}
          </>
        }
      />

      <p className="mb-4 text-sm text-slate-500">
        Enter the workspace to view and manage its apartments, rooms, contracts, payments and
        settings exactly like its administrator.
      </p>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workspace.users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3 text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-slate-600">{ROLE_LABELS[u.role]}</td>
                  <td className="px-5 py-3">
                    <Badge tone={u.isActive ? "green" : "slate"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
