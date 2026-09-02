import { ReactNode } from "react";
import { LucideIcon, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

/**
 * A `Card` whose body can be collapsed/expanded by clicking its header. Built
 * on the native `<details>`/`<summary>` elements, so it needs no client-side
 * JavaScript and works even with `use client` unavailable (Server Components).
 */
export function CollapsibleCard({
  title,
  icon: Icon,
  description,
  defaultOpen = false,
  className,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  description?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card className={className}>
      <details open={defaultOpen} className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 marker:content-none [&::-webkit-details-marker]:hidden">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              {Icon ? <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" /> : null}
              {title}
            </h3>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <ChevronDown
            className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>
      </details>
    </Card>
  );
}
