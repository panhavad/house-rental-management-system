"use client";

import Link, { useLinkStatus } from "next/link";
import { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { LinkStatusContent } from "@/components/ui/LinkStatusContent";

/**
 * A `<Link>` that gives the same click feedback as the `Enter workspace`
 * button: while this specific navigation is pending, its icon is swapped for
 * a spinner (or a spinner is added in front of the label when the link has no
 * icon). Use for plain navigation links — nav items, breadcrumbs, table rows.
 *
 * Takes a pre-rendered `icon` *element* rather than a Lucide component so it
 * can also be used from Server Components (component functions aren't
 * serializable across the server/client boundary; rendered elements are).
 */
export function StatusLink({
  href,
  className,
  icon,
  spinnerClassName,
  title,
  prefetch = false,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  icon?: ReactNode;
  /** Sizing for the spinner, so small text links don't get a 16px spinner. */
  spinnerClassName?: string;
  title?: string;
  prefetch?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} title={title} prefetch={prefetch} onClick={onClick}>
      <LinkStatusContent icon={icon} spinnerClassName={spinnerClassName}>
        {children}
      </LinkStatusContent>
    </Link>
  );
}

/**
 * A `<Link>` wrapping a whole block of content (a card, a row) where swapping
 * an icon isn't possible. Instead it dims the content and centres a spinner
 * over it while that navigation is pending, so the clicked card — and only
 * the clicked card — visibly reacts.
 */
export function CardLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={twMerge("relative block", className)} prefetch={false}>
      <CardLinkOverlay />
      {children}
    </Link>
  );
}

function CardLinkOverlay() {
  const { pending } = useLinkStatus();
  if (!pending) return null;

  return (
    <span
      role="status"
      aria-label="Loading"
      className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/60"
    >
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" aria-hidden="true" />
    </span>
  );
}
