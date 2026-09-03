import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { hasPermission, PERMISSIONS, getRolePermissionMatrix } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { CardLink } from "@/components/ui/StatusLink";

export default async function ApartmentsPage() {
  const user = await requireWorkspaceUser();
  const matrix = await getRolePermissionMatrix(user.workspaceId);
  const apartments = await prisma.apartment.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
    include: { rooms: { select: { status: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Apartments"
        description="All apartment buildings and their rooms"
        breadcrumbs={[{ label: "Apartments" }]}
        actions={
          hasPermission(matrix, user.role, PERMISSIONS.APARTMENTS_WRITE) ? (
            <LinkButton href="/apartments/new" icon={Plus}>
              New apartment
            </LinkButton>
          ) : undefined
        }
      />

      {apartments.length === 0 ? (
        <Card>
          <CardBody>
            <p className="text-sm text-slate-500">No apartments yet.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apartments.map((apartment) => {
            const occupied = apartment.rooms.filter((r) => r.status === "OCCUPIED").length;
            return (
              <CardLink key={apartment.id} href={`/apartments/${apartment.id}`} className="h-full">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardBody>
                    <h3 className="font-semibold text-slate-900">{apartment.name}</h3>
                    {apartment.address ? (
                      <p className="mt-1 text-sm text-slate-500">{apartment.address}</p>
                    ) : null}
                    <p className="mt-3 text-sm text-slate-600">
                      {apartment.rooms.length} rooms · {occupied} occupied
                    </p>
                  </CardBody>
                </Card>
              </CardLink>
            );
          })}
        </div>
      )}
    </div>
  );
}
