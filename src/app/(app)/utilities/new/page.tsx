import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { recordUtilityReading } from "@/app/(app)/utilities/actions";
import { currentMonth } from "@/lib/dates";
import { Save, X } from "lucide-react";

export default async function NewUtilityReadingPage({
  searchParams,
}: {
  searchParams: Promise<{ roomId?: string }>;
}) {
  const user = await requirePermission(PERMISSIONS.UTILITIES_WRITE);
  const { roomId } = await searchParams;
  const rooms = await prisma.room.findMany({
    where: { apartment: { workspaceId: user.workspaceId } },
    orderBy: { name: "asc" },
    include: { apartment: true },
  });
  const preselectedRoomId = roomId && rooms.some((r) => r.id === roomId) ? roomId : "";

  return (
    <div>
      <PageHeader
        title="Record utility reading"
        breadcrumbs={[{ label: "Utilities", href: "/utilities" }, { label: "Record reading" }]}
      />
      <form action={recordUtilityReading} className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Room" htmlFor="roomId" required>
            <Select id="roomId" name="roomId" required defaultValue={preselectedRoomId}>
              <option value="" disabled>
                Select a room
              </option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.apartment.name} · {room.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Month" htmlFor="month" required>
            <Input id="month" name="month" type="month" defaultValue={currentMonth()} required />
          </Field>
        </div>

        <Field label="Water — previous reading" htmlFor="waterPrevious" required>
          <Input id="waterPrevious" name="waterPrevious" type="number" step="0.01" defaultValue={0} required />
        </Field>
        <Field label="Water — current reading" htmlFor="waterCurrent" required>
          <Input id="waterCurrent" name="waterCurrent" type="number" step="0.01" required />
        </Field>
        <Field label="Electricity — previous reading" htmlFor="electricityPrevious" required>
          <Input
            id="electricityPrevious"
            name="electricityPrevious"
            type="number"
            step="0.01"
            defaultValue={0}
            required
          />
        </Field>
        <Field label="Electricity — current reading" htmlFor="electricityCurrent" required>
          <Input id="electricityCurrent" name="electricityCurrent" type="number" step="0.01" required />
        </Field>

        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" icon={Save}>
            Save reading
          </Button>
          <LinkButton href="/utilities" variant="secondary" icon={X}>
            Cancel
          </LinkButton>
        </div>
      </form>
    </div>
  );
}
