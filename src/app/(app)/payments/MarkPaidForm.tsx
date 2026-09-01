"use client";

import { useState } from "react";
import { CircleDollarSign, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function MarkPaidForm({ action, defaultAmount }: { action: (formData: FormData) => void; defaultAmount: number }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-500"
      >
        <CircleDollarSign className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Mark paid
      </button>
    );
  }

  return (
    <form action={action} className="flex items-end gap-2 rounded-md border border-green-200 bg-green-50 p-2">
      <div className="w-28">
        <Field label="Amount (USD)" htmlFor="paidAmount">
          <Input id="paidAmount" name="paidAmount" type="number" step="0.01" defaultValue={defaultAmount} required />
        </Field>
      </div>
      <div className="w-28">
        <Field label="Method" htmlFor="method">
          <Input id="method" name="method" placeholder="Cash, bank..." />
        </Field>
      </div>
      <Button type="submit" variant="primary" className="h-9" icon={Check}>
        Confirm
      </Button>
      <Button type="button" variant="secondary" className="h-9" icon={X} onClick={() => setOpen(false)}>
        Cancel
      </Button>
    </form>
  );
}
