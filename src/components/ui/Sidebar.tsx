"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { NAV_ITEMS, ADMIN_ONLY_NAV_ITEMS, MY_ACCESS_NAV_ITEM, isNavItemActive } from "@/lib/nav-items";

/**
 * Desktop primary navigation, rendered as a horizontal top bar (mirrors the
 * mobile icon strip's concept) instead of a left-hand column, so pages get
 * the full viewport width.
 */
export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const items =
    role === "ADMIN"
      ? [...NAV_ITEMS, ...ADMIN_ONLY_NAV_ITEMS, MY_ACCESS_NAV_ITEM]
      : [...NAV_ITEMS, MY_ACCESS_NAV_ITEM];

  return (
    <nav
      aria-label="Primary"
      className="hidden flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-4 py-2 md:flex"
    >
      {items.map((item) => {
        const isActive = isNavItemActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
