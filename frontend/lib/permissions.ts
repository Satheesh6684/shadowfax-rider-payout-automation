import { UserRole } from "@/lib/types";

export type Permission =
  | "rate_card:write"
  | "payment_config:write"
  | "upload:write"
  | "validation:run"
  | "calculation:run"
  | "exceptions:resolve"
  | "reports:generate"
  | "users:manage"
  | "settings:manage";

/** Mirrors backend/src/utils/permissions.ts exactly — kept manually in
 * sync since this is a small, fixed, four-role matrix. Any drift would
 * only ever make the UI too restrictive relative to what the backend
 * actually allows (never the reverse), since the backend re-checks
 * everything regardless of what the frontend shows. */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    "rate_card:write",
    "payment_config:write",
    "upload:write",
    "validation:run",
    "calculation:run",
    "exceptions:resolve",
    "reports:generate",
    "users:manage",
    "settings:manage",
  ],
  MANAGER: [
    "rate_card:write",
    "payment_config:write",
    "upload:write",
    "validation:run",
    "calculation:run",
    "exceptions:resolve",
    "reports:generate",
  ],
  OPERATIONS: ["upload:write", "validation:run", "calculation:run", "exceptions:resolve"],
  VIEWER: [],
};

export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role as UserRole]?.includes(permission) ?? false;
}
