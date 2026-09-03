import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { LucideIcon, Filter } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { SubmitStatusButton } from "@/components/ui/SubmitStatusButton";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  danger: "bg-red-600 text-white hover:bg-red-500",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
};

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Renders its icon here (while still a Server Component), then hands the
 * already-rendered icon element off to `SubmitStatusButton` — a small Client
 * Component that additionally swaps it for a spinner while the enclosing
 * form is submitting. This keeps `Button` itself usable directly from Server
 * Components (as it always has been) with no change to its public API.
 */
export function Button({
  variant = "primary",
  className,
  icon: Icon,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: LucideIcon; children: ReactNode }) {
  return (
    <SubmitStatusButton
      className={twMerge(BASE_CLASSES, VARIANT_CLASSES[variant], className)}
      icon={Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {...props}
    >
      {children}
    </SubmitStatusButton>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  icon: Icon,
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={twMerge(BASE_CLASSES, VARIANT_CLASSES[variant], className)}>
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

export function FilterButton() {
  return (
    <button
      type="submit"
      className="inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <Filter className="h-4 w-4 shrink-0" aria-hidden="true" />
      Filter
    </button>
  );
}
