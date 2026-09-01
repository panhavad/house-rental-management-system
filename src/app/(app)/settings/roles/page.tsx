import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLE_LABELS,
  getRolePermissionMatrix,
} from "@/lib/rbac";
import { Role } from "@prisma/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Save, ShieldCheck } from "lucide-react";
import { updateRolePermissions } from "@/app/(app)/settings/roles/actions";

const ALL_ROLES: Role[] = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];

export default async function RolesPermissionsPage() {
  const user = await requireWorkspaceUser();
  // Deliberately a literal role check, not the customizable matrix — this page
  // controls the matrix itself, so it can't depend on it (avoids a lockout).
  if (user.role !== "ADMIN") redirect("/");

  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const permissions = Object.values(PERMISSIONS);

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Choose exactly what each role can do. Administrators always have full access."
        breadcrumbs={[{ label: "Roles & permissions" }]}
      />

      <Card className="mb-6">
        <div className="flex items-start gap-2 p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
          <p className="text-sm text-slate-600">
            Check a box to grant that permission to the role in its column, or uncheck to revoke it.
            The <span className="font-medium text-slate-800">Administrator</span> column is always fully
            granted and cannot be changed, so there is never a way to lock every admin out of the system.
          </p>
        </div>
      </Card>

      <form action={updateRolePermissions}>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Permission</th>
                  {ALL_ROLES.map((role) => (
                    <th key={role} className="px-5 py-3 text-center font-medium whitespace-nowrap">
                      {ROLE_LABELS[role]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permissions.map((permission) => (
                  <tr key={permission}>
                    <td className="px-5 py-3 text-slate-700">{PERMISSION_DESCRIPTIONS[permission]}</td>
                    {ALL_ROLES.map((role) => (
                      <td key={role} className="px-5 py-3 text-center">
                        <input
                          type="checkbox"
                          name={`perm:${role}:${permission}`}
                          defaultChecked={role === "ADMIN" ? true : matrix[role][permission]}
                          disabled={role === "ADMIN"}
                          className="h-4 w-4 rounded border-slate-300 text-slate-900 disabled:opacity-50 accent-slate-900"
                          aria-label={`${ROLE_LABELS[role]}: ${PERMISSION_DESCRIPTIONS[permission]}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-200 p-5">
            <Button type="submit" icon={Save}>
              Save changes
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
