import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getAppSettings, CURRENCY_LABELS } from "@/lib/currency";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { StatusLink } from "@/components/ui/StatusLink";
import {
  setupSaveCurrency,
  setupCreateApartment,
  setupCreateRoom,
  setupSaveRates,
  setupFinish,
} from "@/app/(app)/setup/actions";
import { Check, Coins, Building2, DoorOpen, Droplets, PartyPopper, ArrowRight, SkipForward, MapPin, Tag, DollarSign, Zap, ArrowRightLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEP_LABELS = ["Currency", "First apartment", "First room", "Utility rates", "Done"];

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEP_LABELS.map((label, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < current;
        const isCurrent = stepNumber === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isDone
                  ? "bg-green-600 text-white"
                  : isCurrent
                    ? "bg-slate-900 text-white"
                    : "bg-slate-200 text-slate-500"
              }`}
            >
              {isDone ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : stepNumber}
            </span>
            <span className={isCurrent ? "font-medium text-slate-900" : "text-slate-500"}>{label}</span>
            {stepNumber < STEP_LABELS.length ? <span className="text-slate-300">—</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; apartmentId?: string; error?: string }>;
}) {
  const user = await requireWorkspaceUser();
  if (user.role !== "ADMIN") redirect("/");

  const { step: stepParam, apartmentId, error } = await searchParams;
  const step = Math.min(Math.max(Number(stepParam) || 1, 1), 5);

  // Step 3 (room) only makes sense right after creating an apartment in step 2.
  if (step === 3 && !apartmentId) {
    redirect("/setup?step=4");
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Setup wizard"
        description="A few quick steps to get your workspace ready to use — every step can be skipped and finished later."
      />

      <StepIndicator current={step} />

      <Card className="mt-6">
        <CardBody>
          {error ? (
            <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {step === 1 ? <CurrencyStep workspaceId={user.workspaceId} /> : null}
          {step === 2 ? <ApartmentStep workspaceId={user.workspaceId} /> : null}
          {step === 3 && apartmentId ? <RoomStep apartmentId={apartmentId} /> : null}
          {step === 4 ? <RatesStep /> : null}
          {step === 5 ? <DoneStep workspaceId={user.workspaceId} /> : null}
        </CardBody>
      </Card>
    </div>
  );
}

async function CurrencyStep({ workspaceId }: { workspaceId: string }) {
  const settings = await getAppSettings(workspaceId);

  return (
    <div>
      <StepHeading
        icon={Coins}
        title="Choose your currency"
        description="All amounts are entered and stored in USD; this only changes how they're displayed."
      />
      <form action={setupSaveCurrency} className="flex flex-col gap-4">
        <Field label="Display currency" htmlFor="currency" icon={Coins} required>
          <Select id="currency" name="currency" defaultValue={settings.currency} required>
            <option value="USD">{CURRENCY_LABELS.USD}</option>
            <option value="KHR">{CURRENCY_LABELS.KHR}</option>
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
        <div className="flex items-center gap-3">
          <Button type="submit" icon={ArrowRight}>
            Save &amp; continue
          </Button>
          <StatusLink
            href="/setup?step=2"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            icon={<SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />}
          >
            Skip for now
          </StatusLink>
        </div>
      </form>
    </div>
  );
}

async function ApartmentStep({ workspaceId }: { workspaceId: string }) {
  const existingApartment = await prisma.apartment.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <StepHeading
        icon={Building2}
        title="Add your first apartment"
        description="An apartment is a building or property that contains rooms. You can add more later."
      />
      <form action={setupCreateApartment} className="flex flex-col gap-4">
        <Field label="Apartment name" htmlFor="name" icon={Building2} required>
          <Input id="name" name="name" required placeholder="Sunrise Residence" />
        </Field>
        <Field label="Address" htmlFor="address" icon={MapPin}>
          <Input id="address" name="address" placeholder="123 Main Street" />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" icon={ArrowRight}>
            Create &amp; continue
          </Button>
          {existingApartment ? (
            <StatusLink
              href={`/setup?step=3&apartmentId=${existingApartment.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              icon={<SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              Use existing &quot;{existingApartment.name}&quot;
            </StatusLink>
          ) : (
            <StatusLink
              href="/setup?step=4"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
              icon={<SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />}
            >
              Skip for now
            </StatusLink>
          )}
        </div>
      </form>
    </div>
  );
}

function RoomStep({ apartmentId }: { apartmentId: string }) {
  return (
    <div>
      <StepHeading
        icon={DoorOpen}
        title="Add your first room"
        description="Rooms are what you actually rent out — this is where tenants, contracts and payments live."
      />
      <form action={setupCreateRoom.bind(null, apartmentId)} className="flex flex-col gap-4">
        <Field label="Room name" htmlFor="name" icon={DoorOpen} required>
          <Input id="name" name="name" required placeholder="Room 101" />
        </Field>
        <Field label="Type" htmlFor="type" icon={Tag} required>
          <Input id="type" name="type" required placeholder="Studio, 1 Bedroom, ..." />
        </Field>
        <Field label="Rental fee (per month, USD)" htmlFor="rentalFee" icon={DollarSign} required>
          <Input id="rentalFee" name="rentalFee" type="number" step="0.01" min="0" required />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" icon={ArrowRight}>
            Create &amp; continue
          </Button>
          <StatusLink
            href="/setup?step=4"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            icon={<SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />}
          >
            Skip for now
          </StatusLink>
        </div>
      </form>
    </div>
  );
}

function RatesStep() {
  return (
    <div>
      <StepHeading
        icon={Droplets}
        title="Set utility rates"
        description="Price per unit for water & electricity, used to calculate monthly utility costs. You can add more rates later."
      />
      <form action={setupSaveRates} className="flex flex-col gap-4">
        <Field label="Water — price per unit (USD)" htmlFor="waterRate" icon={Droplets}>
          <Input id="waterRate" name="waterRate" type="number" step="0.01" min="0" placeholder="0.80" />
        </Field>
        <Field label="Electricity — price per unit (USD)" htmlFor="electricityRate" icon={Zap}>
          <Input id="electricityRate" name="electricityRate" type="number" step="0.01" min="0" placeholder="0.25" />
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" icon={ArrowRight}>
            Save &amp; continue
          </Button>
          <StatusLink
            href="/setup?step=5"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
            icon={<SkipForward className="h-4 w-4 shrink-0" aria-hidden="true" />}
          >
            Skip for now
          </StatusLink>
        </div>
      </form>
    </div>
  );
}

async function DoneStep({ workspaceId }: { workspaceId: string }) {
  const [apartmentCount, roomCount, rateCount, settings] = await Promise.all([
    prisma.apartment.count({ where: { workspaceId } }),
    prisma.room.count({ where: { apartment: { workspaceId } } }),
    prisma.utilityRate.count({ where: { workspaceId } }),
    getAppSettings(workspaceId),
  ]);

  const items = [
    { label: `Currency set to ${CURRENCY_LABELS[settings.currency]}`, done: true },
    { label: `${apartmentCount} apartment(s) added`, done: apartmentCount > 0 },
    { label: `${roomCount} room(s) added`, done: roomCount > 0 },
    { label: `${rateCount} utility rate(s) configured`, done: rateCount > 0 },
  ];

  return (
    <div>
      <StepHeading
        icon={PartyPopper}
        title="You're all set!"
        description="Here's what's configured so far. Anything skipped can always be added later from the regular menus."
      />
      <ul className="mb-6 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                item.done ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
              }`}
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className={item.done ? "text-slate-700" : "text-slate-400"}>{item.label}</span>
          </li>
        ))}
      </ul>
      <form action={setupFinish}>
        <Button type="submit" icon={ArrowRight}>
          Finish setup &amp; go to dashboard
        </Button>
      </form>
    </div>
  );
}
