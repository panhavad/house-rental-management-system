import { requireWorkspaceUser } from "@/lib/auth-guard";
import {
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  BASELINE_CAPABILITIES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  hasPermission,
  getRolePermissionMatrix,
} from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

export default async function PermissionsPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const permissions = Object.values(PERMISSIONS);

  return (
    <div>
      <PageHeader
        title="My access"
        description="What your account can and cannot do in RentalHRM"
        breadcrumbs={[{ label: "My access" }]}
      />

      <Card className="mb-6">
        <CardBody>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-slate-500" aria-hidden="true" />
            <p className="font-semibold text-slate-900">{ROLE_LABELS[user.role]}</p>
          </div>
          <p className="text-sm text-slate-600">{ROLE_DESCRIPTIONS[user.role]}</p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900">Always available to you</h2>
            <ul className="space-y-2">
              {BASELINE_CAPABILITIES.map((capability) => (
                <li key={capability} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                  {capability}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-900">Actions that make changes</h2>
            <ul className="space-y-2">
              {permissions.map((permission) => {
                const allowed = hasPermission(matrix, user.role, permission);
                return (
                  <li key={permission} className="flex items-start gap-2 text-sm">
                    {allowed ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
                    )}
                    <span className={allowed ? "text-slate-700" : "text-slate-400"}>
                      {PERMISSION_DESCRIPTIONS[permission]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
