"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { hasPermission, Permission } from "@/lib/permissions";

/** `const canEditRateCard = usePermission("rate_card:write");` — reads the
 * current user's role from AuthContext, so every page/component checking
 * permissions stays in sync with whoever's actually logged in. */
export function usePermission(permission: Permission): boolean {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
}
