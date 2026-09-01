import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApartmentForm } from "@/app/(app)/apartments/ApartmentForm";
import { updateApartment } from "@/app/(app)/apartments/actions";

export default async function EditApartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.APARTMENTS_WRITE);
  const { id } = await params;

  const apartment = await prisma.apartment.findFirst({ where: { id, workspaceId: user.workspaceId } });
  if (!apartment) notFound();

  return (
    <div>
      <PageHeader
        title={`Edit ${apartment.name}`}
        breadcrumbs={[
          { label: "Apartments", href: "/apartments" },
          { label: apartment.name, href: `/apartments/${apartment.id}` },
          { label: "Edit" },
        ]}
      />
      <ApartmentForm
        action={updateApartment.bind(null, apartment.id)}
        apartment={apartment}
        cancelHref={`/apartments/${apartment.id}`}
      />
    </div>
  );
}
