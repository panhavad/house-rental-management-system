import { Facility, Room } from "@prisma/client";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { Save, Plus, X } from "lucide-react";

export function RoomForm({
  action,
  apartmentId,
  facilities,
  room,
  selectedFacilityIds = [],
  cancelHref,
}: {
  action: (formData: FormData) => void;
  apartmentId?: string;
  facilities: Facility[];
  room?: Room;
  selectedFacilityIds?: string[];
  cancelHref: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      {apartmentId ? <input type="hidden" name="apartmentId" value={apartmentId} /> : null}

      <Field label="Room name" htmlFor="name" required>
        <Input id="name" name="name" defaultValue={room?.name} required />
      </Field>
      <Field label="Type" htmlFor="type" required>
        <Input id="type" name="type" placeholder="Studio, 1 Bedroom, ..." defaultValue={room?.type} required />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Size (m²)" htmlFor="size">
          <Input id="size" name="size" type="number" step="0.1" defaultValue={room?.size ?? ""} />
        </Field>
        <Field label="Floor" htmlFor="floor">
          <Input id="floor" name="floor" defaultValue={room?.floor ?? ""} />
        </Field>
      </div>
      <Field label="Rental fee (per month, USD)" htmlFor="rentalFee" required>
        <Input
          id="rentalFee"
          name="rentalFee"
          type="number"
          step="0.01"
          defaultValue={room?.rentalFee}
          required
        />
      </Field>
      <Field label="Floor plan URL" htmlFor="floorPlanUrl">
        <Input id="floorPlanUrl" name="floorPlanUrl" defaultValue={room?.floorPlanUrl ?? ""} />
      </Field>

      <Field label="Facilities" htmlFor="facilityIds">
        <div className="grid grid-cols-2 gap-2 rounded-md border border-slate-200 p-3">
          {facilities.map((facility) => (
            <label key={facility.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="facilityIds"
                value={facility.id}
                defaultChecked={selectedFacilityIds.includes(facility.id)}
                className="rounded border-slate-300"
              />
              {facility.name}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Notes" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={3} defaultValue={room?.notes ?? ""} />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" icon={room ? Save : Plus}>
          {room ? "Save changes" : "Create room"}
        </Button>
        <LinkButton href={cancelHref} variant="secondary" icon={X}>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
