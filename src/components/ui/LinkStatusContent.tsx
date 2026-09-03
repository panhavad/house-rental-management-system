"use client";

import { useLinkStatus } from "next/link";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useTranslatedChildren } from "@/components/LanguageProvider";

/**
 * Renders inside a `<Link>` (per Next.js's `useLinkStatus` contract) and
 * swaps the link's icon for a spinner while that specific link's navigation
 * is pending — the `LinkButton` equivalent of `SubmitStatusButton`. Safe to
 * use even outside a `<Link>` (returns a non-pending default, same as
 * `useFormStatus` does with no parent form).
 */
export function LinkStatusContent({
  icon,
  children,
  spinnerClassName = "h-4 w-4",
}: {
  icon?: ReactNode;
  children: ReactNode;
  /** Sizing override so small links can render a proportionally small spinner. */
  spinnerClassName?: string;
}) {
  const { pending } = useLinkStatus();
  const label = useTranslatedChildren(children);
  return (
    <>
      {pending ? (
        <Loader2 className={twMerge("shrink-0 animate-spin", spinnerClassName)} aria-hidden="true" />
      ) : (
        icon
      )}
      {label}
    </>
  );
}
