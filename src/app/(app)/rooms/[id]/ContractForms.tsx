"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Ban, ShieldAlert, X, FilePlus2, Upload, Eye, PencilLine, AlertTriangle, User, Phone, Mail, IdCard, Users, DollarSign, Wallet, Droplets, Zap, CalendarDays, CalendarClock, Paperclip, StickyNote, MessageSquareWarning, KeyRound } from "lucide-react";

export function UploadDocumentForm({ action, label = "Add documents" }: { action: (formData: FormData) => void; label?: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Field label="PDF, JPG, PNG or WEBP (you can select several)" htmlFor="documents" icon={Paperclip}>
          <input
            id="documents"
            name="documents"
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button type="submit" icon={Upload}>
          Upload
        </Button>
        <Button type="button" variant="secondary" icon={X} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function TerminateContractForm({ action }: { action: (formData: FormData) => void }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-300 px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
      >
        <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
        Terminate early
      </button>
    );
  }

  return (
    <form
      action={action}
      className="flex w-full max-w-sm flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-3"
      onSubmit={(e) => {
        if (!confirm("Terminate this contract early? This cannot be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <Field label="Termination reason" htmlFor="reason" icon={MessageSquareWarning}>
        <Textarea id="reason" name="reason" rows={2} required />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="danger" icon={ShieldAlert}>
          Confirm termination
        </Button>
        <Button type="button" variant="secondary" icon={X} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

type PreviewResult = { pdfBase64: string } | { error: string };

/** Small labeled divider used to visually group related fields within a longer form. */
function FormSectionHeading({ icon: Icon, label }: { icon: typeof User; label: string }) {
  return (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
    </div>
  );
}

export function StartContractForm({
  action,
  previewAction,
  defaultWaterMeterStart = 0,
  defaultElectricityMeterStart = 0,
  hasMeterHistory = false,
}: {
  action: (formData: FormData) => void;
  previewAction: (formData: FormData) => Promise<PreviewResult>;
  /** Pre-filled initial meter values — the room's latest recorded reading, if any. */
  defaultWaterMeterStart?: number;
  defaultElectricityMeterStart?: number;
  /** Whether the defaults above came from an actual past reading (shows a hint) or are just a blank starting point. */
  hasMeterHistory?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Revoke the previous object URL whenever it's replaced or the form unmounts,
  // so previewing several times in a row doesn't leak blob URLs.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handlePreview() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    setPreviewError(null);
    startTransition(async () => {
      const result = await previewAction(formData);
      if ("error" in result) {
        setPreviewError(result.error);
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      setPreviewUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    });
  }

  function closePreview() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-6">
      <div>
        <FormSectionHeading icon={User} label="Tenant information" />
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tenant name" htmlFor="tenantName" icon={User} required>
            <Input id="tenantName" name="tenantName" required />
          </Field>
          <Field label="Tenant phone" htmlFor="tenantPhone" icon={Phone}>
            <Input id="tenantPhone" name="tenantPhone" />
          </Field>
          <Field label="Tenant email" htmlFor="tenantEmail" icon={Mail}>
            <Input id="tenantEmail" name="tenantEmail" type="email" />
          </Field>
          <Field label="Tenant ID number" htmlFor="tenantIdNumber" icon={IdCard}>
            <Input id="tenantIdNumber" name="tenantIdNumber" />
          </Field>
          <Field label="Number of people staying" htmlFor="occupants" icon={Users} required>
            <Input id="occupants" name="occupants" type="number" min="1" step="1" defaultValue={1} required />
          </Field>
        </div>
      </div>

      <div>
        <FormSectionHeading icon={KeyRound} label="Lease & property details" />
        <div className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Rental fee (USD)" htmlFor="rentalFee" icon={DollarSign} required>
            <Input id="rentalFee" name="rentalFee" type="number" step="0.01" required />
          </Field>
          <Field label="Deposit (USD)" htmlFor="deposit" icon={Wallet}>
            <Input id="deposit" name="deposit" type="number" step="0.01" defaultValue={0} />
          </Field>
          <Field label="Start date" htmlFor="startDate" icon={CalendarDays} required>
            <Input id="startDate" name="startDate" type="date" required />
          </Field>
          <Field label="End date" htmlFor="endDate" icon={CalendarClock} required>
            <Input id="endDate" name="endDate" type="date" required />
          </Field>
          <Field
            label="Water meter reading (initial)"
            htmlFor="waterMeterStart"
            icon={Droplets}
            required
            hint={hasMeterHistory ? "Defaults to the room's latest recorded reading." : undefined}
          >
            <Input
              id="waterMeterStart"
              name="waterMeterStart"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultWaterMeterStart}
              required
            />
          </Field>
          <Field
            label="Electricity meter reading (initial)"
            htmlFor="electricityMeterStart"
            icon={Zap}
            required
            hint={hasMeterHistory ? "Defaults to the room's latest recorded reading." : undefined}
          >
            <Input
              id="electricityMeterStart"
              name="electricityMeterStart"
              type="number"
              step="0.01"
              min="0"
              defaultValue={defaultElectricityMeterStart}
              required
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contract documents (PDF, JPG, PNG or WEBP — optional, multiple allowed)" htmlFor="documents" icon={Paperclip}>
              <input
                id="documents"
                name="documents"
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes" htmlFor="notes" icon={StickyNote}>
              <Textarea id="notes" name="notes" rows={2} />
            </Field>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" icon={Eye} disabled={isPending} onClick={handlePreview}>
          {isPending ? "Preparing preview…" : "Preview agreement"}
        </Button>
        <Button type="submit" icon={FilePlus2}>
          Start contract
        </Button>
      </div>

      {previewError ? (
        <p className="flex items-center gap-1.5 text-sm text-red-600">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {previewError}
        </p>
      ) : null}

      {previewUrl ? (
        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800">
              <PencilLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              Draft preview — nothing has been saved yet. Adjust the details above and preview again, or start the
              contract when it looks right.
            </p>
            <button
              type="button"
              onClick={closePreview}
              className="shrink-0 rounded-md p-1 text-amber-700 hover:bg-amber-100"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <iframe src={previewUrl} title="Contract agreement preview" className="h-[70vh] w-full rounded-md border border-amber-200 bg-white" />
        </div>
      ) : null}
    </form>
  );
}
