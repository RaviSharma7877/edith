import type { SystemRole } from "@prisma/client"

// ── Permission strings ────────────────────────────────────────────────────────
// Format: "<resource>:<action>"  — actions: read, write, delete, post, export, approve

export type Permission =
  | "accounting:read"  | "accounting:write"  | "accounting:post"   | "accounting:close"
  | "invoices:read"    | "invoices:write"     | "invoices:delete"
  | "bills:read"       | "bills:write"        | "bills:delete"
  | "payments:read"    | "payments:write"
  | "customers:read"   | "customers:write"    | "customers:delete"
  | "vendors:read"     | "vendors:write"      | "vendors:delete"
  | "reports:read"     | "reports:export"
  | "audit:read"
  | "imports:write"
  | "tax:read"         | "tax:write"          | "tax:file"
  | "bank:read"        | "bank:write"         | "bank:reconcile"
  | "members:read"     | "members:write"      | "members:remove"
  | "settings:read"    | "settings:write"
  | "api_keys:read"    | "api_keys:write"
  | "webhooks:read"    | "webhooks:write"
  | "approve:journals" | "approve:payments"   | "approve:period_close"
  | "*"

// ── Role → permissions map ────────────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  SUPER_ADMIN: ["*"],
  ORG_OWNER: ["*"],
  ORG_ADMIN: [
    "accounting:read", "accounting:write", "accounting:post", "accounting:close",
    "invoices:read", "invoices:write", "invoices:delete",
    "bills:read", "bills:write", "bills:delete",
    "payments:read", "payments:write",
    "customers:read", "customers:write", "customers:delete",
    "vendors:read", "vendors:write", "vendors:delete",
    "reports:read", "reports:export",
    "audit:read",
    "imports:write",
    "tax:read", "tax:write", "tax:file",
    "bank:read", "bank:write", "bank:reconcile",
    "members:read", "members:write",
    "settings:read", "settings:write",
    "api_keys:read", "api_keys:write",
    "webhooks:read", "webhooks:write",
    "approve:journals", "approve:payments", "approve:period_close",
  ],
  ACCOUNTANT: [
    "accounting:read", "accounting:write", "accounting:post", "accounting:close",
    "invoices:read", "invoices:write",
    "bills:read", "bills:write",
    "payments:read", "payments:write",
    "customers:read", "customers:write",
    "vendors:read", "vendors:write",
    "reports:read", "reports:export",
    "audit:read",
    "imports:write",
    "tax:read", "tax:write", "tax:file",
    "bank:read", "bank:write", "bank:reconcile",
    "settings:read",
    "approve:journals", "approve:payments", "approve:period_close",
  ],
  BOOKKEEPER: [
    "accounting:read", "accounting:write",
    "invoices:read", "invoices:write",
    "bills:read", "bills:write",
    "payments:read", "payments:write",
    "customers:read", "customers:write",
    "vendors:read", "vendors:write",
    "reports:read",
    "bank:read", "bank:reconcile",
    "imports:write",
    "tax:read",
  ],
  SALES: [
    "invoices:read", "invoices:write",
    "customers:read", "customers:write",
    "reports:read",
    "settings:read",
  ],
  PROJECT_MANAGER: [
    "invoices:read",
    "customers:read",
    "reports:read",
    "settings:read",
  ],
  ANALYST: [
    "accounting:read",
    "invoices:read",
    "bills:read",
    "payments:read",
    "customers:read",
    "vendors:read",
    "reports:read", "reports:export",
    "bank:read",
    "tax:read",
  ],
  AUDITOR: [
    "accounting:read",
    "invoices:read",
    "bills:read",
    "payments:read",
    "customers:read",
    "vendors:read",
    "reports:read", "reports:export",
    "audit:read",
    "bank:read",
    "tax:read",
  ],
  CLIENT: [
    "invoices:read",
    "reports:read",
  ],
  VIEWER: [
    "accounting:read",
    "invoices:read",
    "bills:read",
    "reports:read",
  ],
}

export function getPermissions(role: SystemRole, customPermissions?: string[]): Set<Permission> {
  if (customPermissions?.length) {
    return new Set(customPermissions as Permission[])
  }
  return new Set(ROLE_PERMISSIONS[role] ?? [])
}

export function hasPermission(
  role: SystemRole,
  permission: Permission,
  customPermissions?: string[],
): boolean {
  const perms = getPermissions(role, customPermissions)
  return perms.has("*") || perms.has(permission)
}

// Roles that can hold the canApprove flag for maker-checker workflows
export const MAKER_CHECKER_ELIGIBLE_ROLES: SystemRole[] = [
  "ORG_OWNER", "ORG_ADMIN", "ACCOUNTANT",
]

// Roles that cannot be assigned by other admins (protected)
export const PROTECTED_ROLES: SystemRole[] = ["SUPER_ADMIN", "ORG_OWNER"]

// Roles visible in the invite dropdown
export const ASSIGNABLE_ROLES: SystemRole[] = [
  "ORG_ADMIN", "ACCOUNTANT", "BOOKKEEPER", "SALES",
  "PROJECT_MANAGER", "ANALYST", "AUDITOR", "CLIENT", "VIEWER",
]

// Seat plan limits (seat count per tier)
export const PLAN_SEAT_LIMITS: Record<string, number> = {
  FREE:         3,
  STARTER:      10,
  PROFESSIONAL: 50,
  ENTERPRISE:   Infinity,
}
