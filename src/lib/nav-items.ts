import {
  LayoutDashboard,
  Building2,
  Droplets,
  Receipt,
  History,
  Wrench,
  Gauge,
  Users,
  Coins,
  ShieldCheck,
  Lock,
  Layers,
  DatabaseBackup,
  FileSignature,
  LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Extra path prefixes that should also highlight this item (sub-pages not under its own URL). */
  matchPrefixes?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apartments", label: "Apartments", icon: Building2, matchPrefixes: ["/rooms"] },
  { href: "/utilities", label: "Utilities", icon: Droplets },
  { href: "/payments", label: "Payments", icon: Receipt },
  { href: "/logs", label: "Activity log", icon: History },
  { href: "/settings/facilities", label: "Facilities", icon: Wrench },
  { href: "/settings/rates", label: "Utility rates", icon: Gauge },
  { href: "/settings/contract-template", label: "Contract template", icon: FileSignature },
  { href: "/settings/workspaces", label: "Workspaces", icon: Layers },
];

export const ADMIN_ONLY_NAV_ITEMS: NavItem[] = [
  { href: "/settings/users", label: "Users", icon: Users },
  { href: "/settings/currency", label: "Currency", icon: Coins },
  { href: "/settings/roles", label: "Roles & permissions", icon: Lock },
  { href: "/settings/backup", label: "Backup & restore", icon: DatabaseBackup },
];

export const MY_ACCESS_NAV_ITEM: NavItem = { href: "/permissions", label: "My access", icon: ShieldCheck };

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname.startsWith(item.href)) return true;
  return item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)) ?? false;
}
