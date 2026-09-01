"use client";

import { ReactNode } from "react";
import { Trash2 } from "lucide-react";

const DEFAULT_ICON = <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />;

export function DeleteButton({
  action,
  confirmMessage = "Are you sure? This cannot be undone.",
  label = "Delete",
  icon = DEFAULT_ICON,
}: {
  action: () => void;
  confirmMessage?: string;
  label?: string;
  icon?: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
      >
        {icon}
        {label}
      </button>
    </form>
  );
}
