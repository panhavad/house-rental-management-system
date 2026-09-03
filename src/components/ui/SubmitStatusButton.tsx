"use client";

import { useFormStatus } from "react-dom";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

/**
 * Internal building block shared by `Button` and `DeleteButton`: renders a
 * <button> that automatically swaps its icon for a spinner and disables
 * itself while its enclosing `<form action={...}>` is submitting (via
 * `useFormStatus`), with no effect when there's no parent form.
 *
 * Deliberately takes a pre-rendered `icon` element (not a bare Lucide
 * component reference) — Server Components can render an icon element and
 * pass the *result* down into this Client Component just fine, but passing
 * the unrendered component function itself across the server/client
 * boundary is not serializable and throws at runtime.
 */
export function SubmitStatusButton({
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode }) {
  const { pending } = useFormStatus();
  const showSpinner = props.type === "submit" && pending;

  return (
    <button className={className} disabled={disabled || showSpinner} {...props}>
      {showSpinner ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
}
