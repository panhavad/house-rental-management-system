"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { Ban, ShieldAlert, X, FilePlus2, Upload } from "lucide-react";

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
        <Field label="PDF, JPG, PNG or WEBP (you can select several)" htmlFor="documents">
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
      <Field label="Termination reason" htmlFor="reason">
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

export function StartContractForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Tenant name" htmlFor="tenantName" required>
        <Input id="tenantName" name="tenantName" required />
      </Field>
      <Field label="Tenant phone" htmlFor="tenantPhone">
        <Input id="tenantPhone" name="tenantPhone" />
      </Field>
      <Field label="Tenant email" htmlFor="tenantEmail">
        <Input id="tenantEmail" name="tenantEmail" type="email" />
      </Field>
      <Field label="Tenant ID number" htmlFor="tenantIdNumber">
        <Input id="tenantIdNumber" name="tenantIdNumber" />
      </Field>
      <Field label="Number of people staying" htmlFor="occupants" required>
        <Input id="occupants" name="occupants" type="number" min="1" step="1" defaultValue={1} required />
      </Field>
      <Field label="Rental fee (USD)" htmlFor="rentalFee" required>
        <Input id="rentalFee" name="rentalFee" type="number" step="0.01" required />
      </Field>
      <Field label="Deposit (USD)" htmlFor="deposit">
        <Input id="deposit" name="deposit" type="number" step="0.01" defaultValue={0} />
      </Field>
      <Field label="Start date" htmlFor="startDate" required>
        <Input id="startDate" name="startDate" type="date" required />
      </Field>
      <Field label="End date" htmlFor="endDate" required>
        <Input id="endDate" name="endDate" type="date" required />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Contract documents (PDF, JPG, PNG or WEBP — optional, multiple allowed)" htmlFor="documents">
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
        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" icon={FilePlus2}>
          Start contract
        </Button>
      </div>
    </form>
  );
}
