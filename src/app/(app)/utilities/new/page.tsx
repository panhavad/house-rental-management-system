import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guard";
import { PERMISSIONS } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { recordUtilityReading } from "@/app/(app)/utilities/actions";
import { currentMonth } from "@/lib/dates";
import { getPreviousReadingDefaults } from "@/lib/meter-readings";
import { contractFixedUtilityFees, hasFixedUtilityFee, FIXED_UTILITY_SELECT } from "@/lib/utility-billing";
import { getAppSettings, formatMoney } from "@/lib/currency";
import { Save, X, DoorOpen, CalendarDays, Droplets, Zap, Info } from "lucide-react";

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
  // Only known up front when a room is preselected (e.g. via the room's QR
  // code) — picking a different room from the dropdown below doesn't refetch
  // these, matching the room field's existing plain (non-JS-driven) behavior.
  const previousDefaults = preselectedRoomId
    ? await getPreviousReadingDefaults(preselectedRoomId)
    : { water: 0, electricity: 0 };
  // Same caveat: only resolved for a preselected room, purely as a heads-up
  // that the recorded usage won't drive the price for a fixed utility.
  const [fixedFees, settings] = await Promise.all([
    preselectedRoomId
      ? prisma.contract
          .findFirst({
            where: { roomId: preselectedRoomId, status: "ACTIVE" },
            orderBy: { startDate: "desc" },
            select: FIXED_UTILITY_SELECT,
          })
          .then(contractFixedUtilityFees)
      : contractFixedUtilityFees(null),
    getAppSettings(user.workspaceId),
  ]);

  return (
    <div>
      <PageHeader
        title="Record utility reading"
        breadcrumbs={[{ label: "Utilities", href: "/utilities" }, { label: "Record reading" }]}
      />
      <form action={recordUtilityReading} className="grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Room" htmlFor="roomId" icon={DoorOpen} required>
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
          <Field label="Month" htmlFor="month" icon={CalendarDays} required>
            <Input id="month" name="month" type="month" defaultValue={currentMonth()} required />
          </Field>
        </div>

        {hasFixedUtilityFee(fixedFees) ? (
          <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 sm:col-span-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p>
              This room&apos;s contract uses fixed utility pricing — water{" "}
              {fixedFees.water !== null ? `${formatMoney(fixedFees.water, settings)}/month` : "billed by meter"},
              electricity{" "}
              {fixedFees.electricity !== null
                ? `${formatMoney(fixedFees.electricity, settings)}/month`
                : "billed by meter"}
              . Readings are still recorded, but a fixed utility is charged at its flat price.
            </p>
          </div>
        ) : null}

        <Field label="Water — previous reading" htmlFor="waterPrevious" icon={Droplets} required>
          <Input id="waterPrevious" name="waterPrevious" type="number" step="0.01" defaultValue={previousDefaults.water} required />
        </Field>
        <Field label="Water — current reading" htmlFor="waterCurrent" icon={Droplets} required>
          <Input id="waterCurrent" name="waterCurrent" type="number" step="0.01" required />
        </Field>
        <Field label="Electricity — previous reading" htmlFor="electricityPrevious" icon={Zap} required>
          <Input
            id="electricityPrevious"
            name="electricityPrevious"
            type="number"
            step="0.01"
            defaultValue={previousDefaults.electricity}
            required
          />
        </Field>
        <Field label="Electricity — current reading" htmlFor="electricityCurrent" icon={Zap} required>
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
