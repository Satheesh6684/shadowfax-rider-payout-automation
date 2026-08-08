"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/** A right-anchored slide-over panel — distinct from Modal (centered,
 * blocking) in that it's meant for browsing details alongside a list
 * without losing your place in it. */
export function SidePanel({ isOpen, onClose, title, children }: SidePanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button aria-label="Close panel" className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto border-l border-border bg-surface shadow-soft">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-muted hover:bg-background hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 space-y-3 p-5">{children}</div>
      </div>
    </div>
  );
}
