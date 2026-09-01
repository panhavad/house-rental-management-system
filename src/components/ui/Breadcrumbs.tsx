import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <li className="flex items-center gap-1">
          <Link href="/" className="flex items-center gap-1 hover:text-slate-700 hover:underline">
            <Home className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Dashboard
          </Link>
        </li>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-slate-700 hover:underline">
                  {item.label}
                </Link>
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
