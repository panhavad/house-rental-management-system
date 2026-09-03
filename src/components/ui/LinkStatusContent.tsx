"use client";

import { useLinkStatus } from "next/link";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Renders inside a `<Link>` (per Next.js's `useLinkStatus` contract) and
 * swaps the link's icon for a spinner while that specific link's navigation
 * is pending — the `LinkButton` equivalent of `SubmitStatusButton`. Safe to
 * use even outside a `<Link>` (returns a non-pending default, same as
 * `useFormStatus` does with no parent form).
 */
export function LinkStatusContent({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </>
  );
}
