"use client";

import { useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";

interface DetailSectionProps {
  icon: LucideIcon;
  iconTone: string;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function DetailSection({ icon: Icon, iconTone, title, defaultOpen = true, children }: DetailSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border bg-background">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${iconTone}`}>
            <Icon size={13} />
          </span>
          <span className="text-sm font-medium">{title}</span>
        </span>
        <ChevronDown size={15} className={`text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="space-y-2 border-t border-border px-3 py-3 text-sm">{children}</div>}
    </div>
  );
}
