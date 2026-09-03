import { Role } from "@prisma/client";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Plus, Building2, Star, LogIn } from "lucide-react";
import { createOwnWorkspace } from "@/app/(app)/settings/workspaces/actions";
import { switchWorkspaceAction, setDefaultWorkspaceAction } from "@/lib/actions/workspace-switch";
import { ROLE_LABELS } from "@/lib/rbac";

export default async function WorkspacesPage() {
  const user = await requireWorkspaceUser();

  const preference = !user.impersonating
    ? await prisma.loginPreference.findUnique({ where: { email: user.email!.toLowerCase() } })
    : null;
  const defaultWorkspaceId = preference?.defaultWorkspaceId ?? null;

  // A super admin impersonating a workspace has no availableWorkspaces of
  // their own to list here — just show the one they entered, read-only.
  const workspaces = user.impersonating
    ? [
        {
          workspaceId: user.workspaceId,
          workspaceName: user.workspaceName ?? "",
          role: user.role as string,
        },
      ]
    : user.availableWorkspaces;

  return (
    <div>
      <PageHeader
        title="Workspaces"
        description="Every workspace this account belongs to. Switch instantly, or set one as your default so you don't have to choose it every time you log in."
        breadcrumbs={[{ label: "Workspaces" }]}
      />

      <Card className="mb-6">
        <CardBody>
          <ul className="divide-y divide-slate-100">
            {workspaces.map((workspace) => {
              const isCurrent = workspace.workspaceId === user.workspaceId;
              const isDefault = workspace.workspaceId === defaultWorkspaceId;
              return (
                <li
                  key={workspace.workspaceId}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="font-medium text-slate-900">{workspace.workspaceName}</span>
                    <span className="text-xs text-slate-400">{ROLE_LABELS[workspace.role as Role]}</span>
                    {isCurrent ? (
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">Current</span>
                    ) : null}
                    {isDefault ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Default</span>
                    ) : null}
                  </div>
                  {!user.impersonating ? (
                    <div className="flex items-center gap-2">
                      {!isCurrent ? (
                        <form action={switchWorkspaceAction}>
                          <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                          <Button type="submit" variant="secondary" icon={LogIn}>
                            Switch
                          </Button>
                        </form>
                      ) : null}
                      {!isDefault ? (
                        <form action={setDefaultWorkspaceAction}>
                          <input type="hidden" name="workspaceId" value={workspace.workspaceId} />
                          <Button type="submit" variant="ghost" icon={Star}>
                            Set as default
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </CardBody>
      </Card>

      {user.role === "ADMIN" && !user.impersonating ? (
        <Card className="max-w-lg">
          <CardBody>
            <h2 className="mb-1 font-semibold text-slate-900">Create another workspace</h2>
            <p className="mb-4 text-sm text-slate-500">
              Sets up a brand-new, fully separate workspace with its own data. You&apos;ll be its administrator
              using this same email and password — it&apos;ll show up above right away.
            </p>
            <form action={createOwnWorkspace} className="flex items-end gap-2">
              <div className="flex-1">
                <Field label="New workspace name" htmlFor="workspaceName" icon={Building2}>
                  <Input id="workspaceName" name="workspaceName" required placeholder="My Other Business" />
                </Field>
              </div>
              <Button type="submit" icon={Plus}>
                Create
              </Button>
            </form>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
