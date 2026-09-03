"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { DeleteButton } from "@/components/ui/DeleteButton";
import {
  Save,
  X,
  Pencil,
  Tag,
  Landmark,
  User,
  Hash,
  QrCode,
  StickyNote,
  Plus,
} from "lucide-react";
import type { PaymentMethod } from "@prisma/client";

function FormFields({ method }: { method?: PaymentMethod }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="label" icon={Tag} required>
        <Input id="label" name="label" defaultValue={method?.label} placeholder="ABA Bank, Wing, Cash, ..." required />
      </Field>
      <Field label="Bank / provider name" htmlFor="bankName" icon={Landmark}>
        <Input id="bankName" name="bankName" defaultValue={method?.bankName ?? ""} />
      </Field>
      <Field label="Account holder name" htmlFor="accountName" icon={User}>
        <Input id="accountName" name="accountName" defaultValue={method?.accountName ?? ""} />
      </Field>
      <Field label="Account / phone number" htmlFor="accountNumber" icon={Hash}>
        <Input id="accountNumber" name="accountNumber" defaultValue={method?.accountNumber ?? ""} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="QR code image (optional)" htmlFor="qrImage" icon={QrCode}>
          <input
            id="qrImage"
            name="qrImage"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
        </Field>
        {method?.qrImageUrl ? (
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- small local thumbnail, not worth next/image config */}
            <img src={method.qrImageUrl} alt="Current QR code" className="h-16 w-16 rounded border border-slate-200 object-contain" />
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input type="checkbox" name="removeQr" className="rounded border-slate-300" />
              Remove current QR code
            </label>
          </div>
        ) : null}
      </div>
      <div className="sm:col-span-2">
        <Field label="Notes" htmlFor="notes" icon={StickyNote}>
          <Textarea id="notes" name="notes" rows={2} defaultValue={method?.notes ?? ""} placeholder="e.g. instructions for the tenant" />
        </Field>
      </div>
    </div>
  );
}

export function AddPaymentMethodForm({ action }: { action: (formData: FormData) => void }) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormFields />
      <div>
        <Button type="submit" icon={Plus}>
          Add payment method
        </Button>
      </div>
    </form>
  );
}

/** One payment method's display row, with an inline "Edit" toggle (expands a full-width form below) and a delete button. */
export function PaymentMethodCard({
  method,
  updateAction,
  deleteAction,
}: {
  method: PaymentMethod;
  updateAction: (formData: FormData) => void;
  deleteAction: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {method.qrImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small local thumbnail, not worth next/image config
            <img
              src={method.qrImageUrl}
              alt={`${method.label} QR code`}
              className="h-16 w-16 shrink-0 rounded border border-slate-200 object-contain"
            />
          ) : null}
          <div>
            <p className="font-medium text-slate-900">{method.label}</p>
            <div className="mt-1 flex flex-col gap-0.5 text-sm text-slate-500">
              {method.bankName ? (
                <span className="flex items-center gap-1.5">
                  <Landmark className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {method.bankName}
                </span>
              ) : null}
              {method.accountName ? (
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {method.accountName}
                </span>
              ) : null}
              {method.accountNumber ? (
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  {method.accountNumber}
                </span>
              ) : null}
            </div>
            {method.notes ? <p className="mt-1 text-xs text-slate-400">{method.notes}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Edit
            </button>
          ) : null}
          <DeleteButton action={deleteAction} confirmMessage={`Remove payment method "${method.label}"?`} />
        </div>
      </div>

      {isEditing ? (
        <form action={updateAction} className="mt-4 flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
          <FormFields method={method} />
          <div className="flex gap-2">
            <Button type="submit" icon={Save}>
              Save changes
            </Button>
            <Button type="button" variant="secondary" icon={X} onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
