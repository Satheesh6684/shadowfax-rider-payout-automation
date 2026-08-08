export const ROLES = ["ADMIN", "MANAGER", "OPERATIONS", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "rate_card:write"
  | "rate_card:read"
  | "payment_config:write"
  | "payment_config:read"
  | "upload:write"
  | "upload:read"
  | "validation:run"
  | "validation:read"
  | "calculation:run"
  | "calculation:read"
  | "exceptions:resolve"
  | "exceptions:read"
  | "reports:generate"
  | "reports:read"
  | "riders:read"
  | "users:manage"
  | "settings:manage";

const ALL_PERMISSIONS: Permission[] = [
  "rate_card:write",
  "rate_card:read",
  "payment_config:write",
  "payment_config:read",
  "upload:write",
  "upload:read",
  "validation:run",
  "validation:read",
  "calculation:run",
  "calculation:read",
  "exceptions:resolve",
  "exceptions:read",
  "reports:generate",
  "reports:read",
  "riders:read",
  "users:manage",
  "settings:manage",
];

/**
 * Code-defined role → permission matrix, not a DB-editable table. RBAC
 * doesn't require every system to make permissions themselves dynamic —
 * for four fixed roles, a centralized, reviewable matrix here is more
 * auditable than scattering ad-hoc checks (or a permissions UI) across the
 * codebase, and is exactly as easy to extend when a fifth role is needed.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  MANAGER: [
    "rate_card:write",
    "rate_card:read",
    "payment_config:write",
    "payment_config:read",
    "upload:write",
    "upload:read",
    "validation:run",
    "validation:read",
    "calculation:run",
    "calculation:read",
    "exceptions:resolve",
    "exceptions:read",
    "reports:generate",
    "reports:read",
    "riders:read",
  ],
  OPERATIONS: [
    "rate_card:read",
    "payment_config:read",
    "upload:write",
    "upload:read",
    "validation:run",
    "validation:read",
    "calculation:run",
    "calculation:read",
    "exceptions:resolve",
    "exceptions:read",
    "reports:read",
    "riders:read",
  ],
  VIEWER: [
    "rate_card:read",
    "payment_config:read",
    "upload:read",
    "validation:read",
    "calculation:read",
    "exceptions:read",
    "reports:read",
    "riders:read",
  ],
};

export function roleHasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role];
  return permissions ? permissions.includes(permission) : false;
}

export function isValidRole(role: string): role is Role {
  return (ROLES as readonly string[]).includes(role);
}
