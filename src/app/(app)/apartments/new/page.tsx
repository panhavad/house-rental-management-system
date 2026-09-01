import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApartmentForm } from "@/app/(app)/apartments/ApartmentForm";
import { createApartment } from "@/app/(app)/apartments/actions";

export default async function NewApartmentPage() {
  await requirePermission(PERMISSIONS.APARTMENTS_WRITE);

  return (
    <div>
      <PageHeader
        title="New apartment"
        breadcrumbs={[{ label: "Apartments", href: "/apartments" }, { label: "New apartment" }]}
      />
      <ApartmentForm action={createApartment} cancelHref="/apartments" />
    </div>
  );
}
