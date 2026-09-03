import { Field, Input, Textarea } from "@/components/ui/Field";
import { Button, LinkButton } from "@/components/ui/Button";
import { Apartment } from "@prisma/client";
import { Save, Plus, X, MapPin, Link as LinkIcon, AlignLeft, Building2 } from "lucide-react";

export function ApartmentForm({
  action,
  apartment,
  cancelHref,
}: {
  action: (formData: FormData) => void;
  apartment?: Apartment;
  cancelHref: string;
}) {
  return (
    <form action={action} className="flex max-w-xl flex-col gap-4">
      <Field label="Name" htmlFor="name" icon={Building2} required>
        <Input id="name" name="name" defaultValue={apartment?.name} required />
      </Field>
      <Field label="Address" htmlFor="address" icon={MapPin}>
        <Input id="address" name="address" defaultValue={apartment?.address ?? ""} />
      </Field>
      <Field label="Map link" htmlFor="mapUrl" icon={LinkIcon}>
        <Input
          id="mapUrl"
          name="mapUrl"
          type="url"
          placeholder="https://maps.google.com/..."
          defaultValue={apartment?.mapUrl ?? ""}
        />
      </Field>
      <Field label="Description" htmlFor="description" icon={AlignLeft}>
        <Textarea id="description" name="description" rows={3} defaultValue={apartment?.description ?? ""} />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" icon={apartment ? Save : Plus}>
          {apartment ? "Save changes" : "Create apartment"}
        </Button>
        <LinkButton href={cancelHref} variant="secondary" icon={X}>
          Cancel
        </LinkButton>
      </div>
    </form>
  );
}
