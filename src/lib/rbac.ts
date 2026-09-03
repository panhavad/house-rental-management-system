import { Role } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Central permission matrix for RentalHRM.
 *
 * - Administrator — full access, including user management. Always granted every
 *   permission regardless of database overrides, so admins can never lock
 *   themselves out.
 * - Manager       — manage apartments/rooms/contracts/utilities/payments/facilities/rates.
 * - Staff         — record utility readings only.
 * - Viewer        — read-only access to everything (no write permissions at all).
 *
 * These defaults are only used to seed the customizable `RolePermission` table the
 * first time it's read. After that, an administrator can grant/revoke individual
 * permissions per role from Settings → Roles & permissions.
 */
export const PERMISSIONS = {
  APARTMENTS_WRITE: "apartments:write",
  ROOMS_WRITE: "rooms:write",
  CONTRACTS_WRITE: "contracts:write",
  UTILITIES_WRITE: "utilities:write",
  PAYMENTS_WRITE: "payments:write",
  FACILITIES_WRITE: "facilities:write",
  RATES_WRITE: "rates:write",
  USERS_WRITE: "users:write",
  CURRENCY_WRITE: "currency:write",
  PAYMENT_METHODS_WRITE: "payment-methods:write",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** The roles that actually belong to a workspace's customizable matrix (excludes SUPER_ADMIN). */
export type WorkspaceRole = Exclude<Role, "SUPER_ADMIN">;

const ALL_PERMISSIONS = Object.values(PERMISSIONS);
const ALL_ROLES: WorkspaceRole[] = ["ADMIN", "MANAGER", "STAFF", "VIEWER"];

const DEFAULT_ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    PERMISSIONS.APARTMENTS_WRITE,
    PERMISSIONS.ROOMS_WRITE,
    PERMISSIONS.CONTRACTS_WRITE,
    PERMISSIONS.UTILITIES_WRITE,
    PERMISSIONS.PAYMENTS_WRITE,
    PERMISSIONS.FACILITIES_WRITE,
    PERMISSIONS.RATES_WRITE,
  ],
  STAFF: [PERMISSIONS.UTILITIES_WRITE],
  VIEWER: [],
};

export type PermissionMatrix = Record<Role, Record<Permission, boolean>>;

/** Flattened {role, permission, allowed} rows for the defaults, used to seed a brand-new workspace. */
export const DEFAULT_ROLE_PERMISSIONS_SEED: { role: Role; permission: string; allowed: boolean }[] =
  ALL_ROLES.flatMap((role) =>
    ALL_PERMISSIONS.map((permission) => ({
      role,
      permission,
      allowed: DEFAULT_ROLE_PERMISSIONS[role].includes(permission),
    }))
  );

function buildMatrix(rows: { role: Role; permission: string; allowed: boolean }[]): PermissionMatrix {
  const matrix = {} as PermissionMatrix;
  for (const role of ALL_ROLES) {
    matrix[role] = {} as Record<Permission, boolean>;
    for (const permission of ALL_PERMISSIONS) {
      matrix[role][permission] = false;
    }
  }
  for (const row of rows) {
    if (matrix[row.role] && ALL_PERMISSIONS.includes(row.permission as Permission)) {
      matrix[row.role][row.permission as Permission] = row.allowed;
    }
  }
  return matrix;
}

/**
 * Loads the customizable role → permission matrix for one workspace, seeding it
 * from the hardcoded defaults the first time it's ever read. Cached per request
 * (per workspaceId).
 */
export const getRolePermissionMatrix = cache(async (workspaceId: string): Promise<PermissionMatrix> => {
  const existing = await prisma.rolePermission.findMany({ where: { workspaceId } });

  if (existing.length === 0) {
    const rows = DEFAULT_ROLE_PERMISSIONS_SEED.map((row) => ({ ...row, workspaceId }));
    await prisma.rolePermission.createMany({ data: rows });
    return buildMatrix(rows);
  }

  return buildMatrix(existing);
});

/**
 * Checks whether a role has a permission. Administrators (and super admins)
 * always have every permission, regardless of what's stored, so the system can
 * never be misconfigured into locking out all admins.
 */
export function hasPermission(matrix: PermissionMatrix, role: Role, permission: Permission): boolean {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  return matrix[role]?.[permission] ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Administrator",
  MANAGER: "Manager",
  STAFF: "Staff",
  VIEWER: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Platform owner. Not tied to any workspace — can see and manage every workspace.",
  ADMIN: "Full access to every feature in their workspace, including user management and system settings.",
  MANAGER: "Manages the day-to-day property operations: apartments, rooms, contracts, utilities, payments, facilities and rates.",
  STAFF: "Can record monthly utility meter readings only. Everything else is read-only.",
  VIEWER: "Read-only access to everything — cannot create, edit or delete anything.",
};

/** Human-readable capability, shown on the "My access" page. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  [PERMISSIONS.APARTMENTS_WRITE]: "Create, edit and delete apartments",
  [PERMISSIONS.ROOMS_WRITE]: "Create, edit and delete rooms, and manage room facilities",
  [PERMISSIONS.CONTRACTS_WRITE]: "Start, end and terminate tenant contracts, and upload contract documents",
  [PERMISSIONS.UTILITIES_WRITE]: "Record monthly water & electricity meter readings",
  [PERMISSIONS.PAYMENTS_WRITE]: "Generate invoices and mark payments as paid or overdue",
  [PERMISSIONS.FACILITIES_WRITE]: "Add and remove room facilities/amenities",
  [PERMISSIONS.RATES_WRITE]: "Add new utility rates (water/electricity price per unit)",
  [PERMISSIONS.USERS_WRITE]: "Create user accounts and change roles or active status",
  [PERMISSIONS.CURRENCY_WRITE]: "Change the system's display currency and exchange rate",
  [PERMISSIONS.PAYMENT_METHODS_WRITE]: "Manage the bank accounts / QR codes shown on generated invoices",
};

/** Baseline capabilities every signed-in user has, regardless of role. */
export const BASELINE_CAPABILITIES: string[] = [
  "View all apartments, rooms and their facilities",
  "View tenant contracts and contract history",
  "View utility readings and utility rates",
  "View payments and payment history",
  "View the full activity log",
];
