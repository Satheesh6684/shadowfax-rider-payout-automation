"use client";

import { useRouter } from "next/navigation";
import { LogOut, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { WeekPill } from "./WeekPill";

// Static placeholder week for Phase 0/1. A real week-selector context lands
// alongside the rate card table's week picker.
const CURRENT_WEEK_LABEL = "04 Aug – 10 Aug 2026";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-muted">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search stores, riders, orders…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>

      <WeekPill label={CURRENT_WEEK_LABEL} isCurrent />

      {user && (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-medium text-primary">
            {initials(user.name)}
          </div>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="rounded-md p-1.5 text-muted hover:bg-background hover:text-foreground"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}
    </header>
  );
}
