"use client";

import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { StatusLink } from "@/components/ui/StatusLink";
import { NAV_ITEMS, ADMIN_ONLY_NAV_ITEMS, MY_ACCESS_NAV_ITEM, isNavItemActive } from "@/lib/nav-items";

/**
 * Always-visible, icon-based navigation strip for small screens. Replaces the
 * need to open a hamburger drawer — every section is one tap away, and the
 * row scrolls horizontally instead of wrapping, so it stays compact.
 */
export function MobileIconNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items =
    role === "ADMIN"
      ? [...NAV_ITEMS, ...ADMIN_ONLY_NAV_ITEMS, MY_ACCESS_NAV_ITEM]
      : [...NAV_ITEMS, MY_ACCESS_NAV_ITEM];

  return (
    <nav
      aria-label="Primary"
      className="flex gap-0.5 overflow-x-auto border-b border-slate-200 bg-white px-1.5 py-1 md:hidden"
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item, pathname);
        const Icon = item.icon;
        return (
          <StatusLink
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2.5 py-1.5 transition-colors ${
              isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
            icon={<Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}
            spinnerClassName="h-5 w-5"
          >
            <span className="max-w-14 truncate text-[10px] font-medium leading-none">{item.label}</span>
          </StatusLink>
        );
      })}
    </nav>
  );
}
