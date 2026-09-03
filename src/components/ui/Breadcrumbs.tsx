import { ChevronRight, Home } from "lucide-react";
import { StatusLink } from "@/components/ui/StatusLink";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <li className="flex items-center gap-1">
          <StatusLink
            href="/"
            className="flex items-center gap-1 hover:text-slate-700 hover:underline"
            icon={<Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
            spinnerClassName="h-3.5 w-3.5"
          >
            Dashboard
          </StatusLink>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              {item.href && !isLast ? (
                <StatusLink
                  href={item.href}
                  className="flex items-center gap-1 hover:text-slate-700 hover:underline"
                  spinnerClassName="h-3.5 w-3.5"
                >
                  {item.label}
                </StatusLink>
              ) : (
                <span className={isLast ? "font-medium text-slate-700" : ""} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
