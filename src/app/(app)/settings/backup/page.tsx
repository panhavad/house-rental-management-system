import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { RestoreButton } from "@/components/ui/RestoreButton";
import { restoreOwnWorkspaceBackupAction } from "@/app/(app)/settings/backup/actions";
import { Download, DatabaseBackup } from "lucide-react";

export default async function BackupPage() {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") redirect("/");

  const workspace = await prisma.workspace.findUnique({ where: { id: user.workspaceId } });

  return (
    <div>
      <PageHeader
        title="Backup & restore"
        description="Download a complete snapshot of your workspace's data, or restore it from a previous backup."
        breadcrumbs={[{ label: "Backup & restore" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
              <Download className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Download backup
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Downloads everything in <strong>{workspace?.name}</strong> — apartments, rooms, contracts,
              payments, utility readings, facilities, rates, users and activity history — as a single JSON
              file. Keep it somewhere safe: anyone who has the file can restore it into this workspace.
            </p>
            <LinkButton href="/api/backup/export" icon={Download}>
              Download backup
            </LinkButton>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
              <DatabaseBackup className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              Restore from backup
            </h2>
            <p className="mb-4 text-sm text-slate-500">
              Replaces <strong>all current data</strong> in this workspace with the contents of the backup
              file — including apartments, contracts, payments and users. This cannot be undone, so consider
              downloading a fresh backup first.
            </p>
            <RestoreButton
              action={restoreOwnWorkspaceBackupAction}
              confirmMessage={`Restore from "{filename}"? This will permanently replace ALL current data in "${workspace?.name}" with the selected backup file. This cannot be undone.`}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
