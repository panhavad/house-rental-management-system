import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "@/app/(app)/settings/payment-methods/actions";
import { AddPaymentMethodForm, PaymentMethodCard } from "@/app/(app)/settings/payment-methods/PaymentMethodForm";

export default async function PaymentMethodsPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  if (!hasPermission(matrix, user.role, PERMISSIONS.PAYMENT_METHODS_WRITE)) redirect("/");

  const methods = await prisma.paymentMethod.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Payment methods"
        description="Bank accounts, e-wallet QR codes and other ways tenants can pay — printed on every generated invoice."
        breadcrumbs={[{ label: "Payment methods" }]}
      />

      <Card className="mb-6">
        <CardBody>
          <h2 className="mb-4 font-semibold text-slate-900">Add a payment method</h2>
          <AddPaymentMethodForm action={createPaymentMethod} />
        </CardBody>
      </Card>

      {methods.length === 0 ? (
        <Card>
          <p className="p-5 text-sm text-slate-500">
            No payment methods yet — invoices will be generated without payment instructions until you add one.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {methods.map((method) => (
            <Card key={method.id}>
              <CardBody>
                <PaymentMethodCard
                  method={method}
                  updateAction={updatePaymentMethod.bind(null, method.id)}
                  deleteAction={deletePaymentMethod.bind(null, method.id)}
                />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
