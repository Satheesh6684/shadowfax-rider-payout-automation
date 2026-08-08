"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileSpreadsheet,
  SlidersHorizontal,
  UploadCloud,
  ShieldCheck,
  Calculator,
  AlertTriangle,
  Search,
  FileBarChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// Order matches SRS §10 exactly — this sequence is the operational workflow,
// not just a menu.
const NAV_ITEMS: NavItem[] = [
  { label: "Rate Card", href: "/rate-card", icon: FileSpreadsheet },
  { label: "Payment Configuration", href: "/payment-configuration", icon: SlidersHorizontal },
  { label: "Upload Center", href: "/upload-center", icon: UploadCloud },
  { label: "Review & Validate", href: "/review-validate", icon: ShieldCheck },
  { label: "Calculation Engine", href: "/calculation-engine", icon: Calculator },
  { label: "Exceptions", href: "/exceptions", icon: AlertTriangle },
  { label: "Rider Search", href: "/rider-search", icon: Search },
  { label: "Reports", href: "/reports", icon: FileBarChart },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-surface">
      <Link
        href="/rate-card"
        className="flex h-16 items-center gap-2 border-b border-border px-5 font-semibold tracking-tight"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
          S
        </span>
        <span className="text-sm leading-tight">
          Shadowfax
          <br />
          <span className="text-xs font-normal text-muted">Rider Payout Arrears</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary-soft font-medium text-primary"
                  : "text-foreground/80 hover:bg-background",
              ].join(" ")}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon size={16} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
