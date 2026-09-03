"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Ban, ShieldAlert, X, FilePlus2, Upload, Eye, PencilLine, AlertTriangle, User, Phone, Mail, IdCard, Users, DollarSign, Wallet, Droplets, Zap, CalendarDays, CalendarClock, Paperclip, StickyNote, MessageSquareWarning, KeyRound, FileText, ExternalLink, Loader2 } from "lucide-react";

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

/**
 * Shared state for the contract PDFs rendered on this page: runs a server action
 * that returns a base64 PDF, turns it into an object URL for an `<iframe>`, and
 * makes sure previous URLs are revoked instead of leaking.
 */
function useContractPdf() {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function load(run: () => Promise<PreviewResult>) {
    setError(null);
    startTransition(async () => {
      const result = await run();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const bytes = Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "application/pdf" });
      setUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    });
  }

  const clear = useCallback(() => {
    setError(null);
    setUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  }, []);

  return { url, error, isPending, load, clear };
}

/**
 * Opens the agreement of an already-started contract in a modal viewer, so the
 * details that were signed off can be checked without leaving the room page.
 */
export function ReviewContractButton({ action, tenantName }: { action: () => Promise<PreviewResult>; tenantName?: string }) {
  const [open, setOpen] = useState(false);
  const { url, error, isPending, load, clear } = useContractPdf();

  const close = useCallback(() => {
    setOpen(false);
    clear();
  }, [clear]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  function handleOpen() {
    setOpen(true);
    load(action);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
      >
        <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
        Review contract
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Contract agreement"
          onClick={close}
        >
          <div
            className="flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  Contract agreement
                </h2>
                {tenantName ? <p className="truncate text-xs text-slate-500">{tenantName}</p> : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Open in new tab
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={close}
                  className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                  aria-label="Close contract"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="flex min-h-[60vh] flex-1 items-center justify-center bg-slate-50 p-3">
              {error ? (
                <p className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : url ? (
                <iframe
                  src={url}
                  title="Contract agreement"
                  className="h-[70vh] w-full rounded-md border border-slate-200 bg-white"
                />
              ) : (
                <p className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                  {isPending ? "Loading contract…" : "Preparing contract…"}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

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
  const { url: previewUrl, error: previewError, isPending, load, clear: closePreview } = useContractPdf();

  function handlePreview() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    load(() => previewAction(formData));
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
