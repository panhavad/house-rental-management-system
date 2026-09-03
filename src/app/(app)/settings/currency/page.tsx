import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Save, Coins, ArrowRightLeft } from "lucide-react";
import { getAppSettings, formatMoney } from "@/lib/currency";
import { updateCurrencySettings } from "@/app/(app)/settings/currency/actions";

export default async function CurrencySettingsPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  if (!hasPermission(matrix, user.role, PERMISSIONS.CURRENCY_WRITE)) redirect("/");

  const settings = await getAppSettings(user.workspaceId);

  // Example amounts to preview how a rent value looks in the current settings.
  const sampleUsd = 250;

  return (
    <div>
      <PageHeader
        title="Currency"
        description="Choose the currency shown throughout the app. All amounts are stored in USD and converted for display using the exchange rate below."
        breadcrumbs={[{ label: "Currency" }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardBody>
            <form action={updateCurrencySettings} className="flex flex-col gap-4">
              <Field label="Display currency" htmlFor="currency" icon={Coins} required>
                <Select id="currency" name="currency" defaultValue={settings.currency} required>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="KHR">Cambodian Riel (KHR)</option>
                </Select>
              </Field>
              <Field label="Exchange rate (KHR per 1 USD)" htmlFor="exchangeRate" icon={ArrowRightLeft} required>
                <Input
                  id="exchangeRate"
                  name="exchangeRate"
                  type="number"
                  step="1"
                  min="1"
                  defaultValue={settings.exchangeRate}
                  required
                />
              </Field>
              <div>
                <Button type="submit" icon={Save}>
                  Save currency settings
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Coins className="h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">Preview</p>
            </div>
            <p className="text-sm text-slate-500">
              A rent of <span className="font-medium text-slate-700">$250.00 USD</span> currently displays
              as:
            </p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(sampleUsd, settings)}</p>
            <p className="mt-4 text-xs text-slate-400">
              Amounts are always entered in USD when creating rooms, contracts, rates and payments — this
              setting only changes how they&apos;re displayed.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
