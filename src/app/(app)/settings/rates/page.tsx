import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createUtilityRate } from "@/app/(app)/settings/rates/actions";
import { Plus, Tag, DollarSign } from "lucide-react";
import { getAppSettings, formatMoney } from "@/lib/currency";

export default async function RatesPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const canWrite = hasPermission(matrix, user.role, PERMISSIONS.RATES_WRITE);
  const [rates, settings] = await Promise.all([
    prisma.utilityRate.findMany({ where: { workspaceId: user.workspaceId }, orderBy: { effectiveFrom: "desc" } }),
    getAppSettings(user.workspaceId),
  ]);

  const currentWater = rates.find((r) => r.type === "WATER");
  const currentElectricity = rates.find((r) => r.type === "ELECTRICITY");

  return (
    <div>
      <PageHeader
        title="Utility rates"
        description="Price per unit used to compute monthly utility costs. Adding a rate makes it the new current rate."
        breadcrumbs={[{ label: "Utility rates" }]}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Current water rate</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {currentWater ? `${formatMoney(currentWater.pricePerUnit, settings)}/unit` : "Not set"}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">Current electricity rate</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {currentElectricity ? `${formatMoney(currentElectricity.pricePerUnit, settings)}/unit` : "Not set"}
            </p>
          </CardBody>
        </Card>
      </div>

      {canWrite ? (
        <form action={createUtilityRate} className="mb-6 flex max-w-md items-end gap-2">
          <div className="w-36 shrink-0">
            <Field label="Type" htmlFor="type" icon={Tag}>
              <Select id="type" name="type" required defaultValue="">
                <option value="" disabled>
                  Select
                </option>
                <option value="WATER">Water</option>
                <option value="ELECTRICITY">Electricity</option>
              </Select>
            </Field>
          </div>
          <div className="flex-1">
            <Field label="Price per unit (USD)" htmlFor="pricePerUnit" icon={DollarSign}>
              <Input id="pricePerUnit" name="pricePerUnit" type="number" step="0.01" required />
            </Field>
          </div>
          <Button type="submit" icon={Plus}>
            Add rate
          </Button>
        </form>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-slate-900">Rate history</h2>
      <Card>
        <ul className="divide-y divide-slate-100">
          {rates.map((rate) => (
            <li key={rate.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span className="text-slate-700">{rate.type}</span>
              <span className="text-slate-500">
                {formatMoney(rate.pricePerUnit, settings)}/unit · effective{" "}
                {rate.effectiveFrom.toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
