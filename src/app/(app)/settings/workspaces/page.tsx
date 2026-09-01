import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { getWorkspacesForAdminEmail } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Plus, Building2 } from "lucide-react";
import { createOwnWorkspace } from "@/app/(app)/settings/workspaces/actions";

export default async function WorkspacesPage() {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") redirect("/");

  const currentUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const workspaces = await getWorkspacesForAdminEmail(currentUser.email);

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every isolated workspace where you're an administrator. Sign in to a different one by entering its name at login."
        breadcrumbs={[{ label: "Workspaces" }]}
      />

      <Card className="mb-6">
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {workspaces.map((workspace) => (
              <li key={workspace.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="font-medium text-slate-900">{workspace.name}</span>
                  {workspace.id === user.workspaceId ? (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Current</span>
                  ) : null}
                </div>
                <span className="text-xs text-slate-400">Login name: {workspace.slug}</span>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <Card className="max-w-lg">
        <CardBody>
          <h2 className="mb-1 font-semibold text-slate-900">Create another workspace</h2>
          <p className="mb-4 text-sm text-slate-500">
            Sets up a brand-new, fully separate workspace with its own data. You&apos;ll be its administrator
            using this same email and password — just enter the new workspace name at login to switch.
          </p>
          <form action={createOwnWorkspace} className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="New workspace name" htmlFor="workspaceName">
                <Input id="workspaceName" name="workspaceName" required placeholder="My Other Business" />
              </Field>
            </div>
            <Button type="submit" icon={Plus}>
              Create
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
