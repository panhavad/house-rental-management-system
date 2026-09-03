import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { DeleteButton } from "@/components/ui/DeleteButton";
import { createFacility, deleteFacility } from "@/app/(app)/settings/facilities/actions";
import { Plus, Wrench } from "lucide-react";

export default async function FacilitiesPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const canWrite = hasPermission(matrix, user.role, PERMISSIONS.FACILITIES_WRITE);
  const facilities = await prisma.facility.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Facilities"
        description="Room amenities available for selection"
        breadcrumbs={[{ label: "Facilities" }]}
      />

      {canWrite ? (
        <form action={createFacility} className="mb-6 flex max-w-md items-end gap-2">
          <div className="flex-1">
            <Field label="New facility name" htmlFor="name" icon={Wrench}>
              <Input id="name" name="name" required />
            </Field>
          </div>
          <Button type="submit" icon={Plus}>
            Add
          </Button>
        </form>
      ) : null}

      <Card>
        {facilities.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">No facilities yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {facilities.map((facility) => (
              <li key={facility.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <span className="text-slate-700">{facility.name}</span>
                {canWrite ? (
                  <DeleteButton
                    action={deleteFacility.bind(null, facility.id)}
                    confirmMessage={`Delete facility "${facility.name}"?`}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
