import { AlertCircle, CheckCircle2, EyeOff } from "lucide-react";
import { ExceptionSummary } from "@/lib/types";

interface ExceptionSummaryCardsProps {
  summary: ExceptionSummary | null;
}

export function ExceptionSummaryCards({ summary }: ExceptionSummaryCardsProps) {
  const cards = [
    {
      icon: AlertCircle,
      tone: "bg-danger-soft text-danger",
      label: "Open Exceptions",
      value: summary?.open ?? 0,
      sub: `${summary?.openBySource?.VALIDATION ?? 0} validation · ${summary?.openBySource?.CALCULATION ?? 0} calculation`,
    },
    {
      icon: CheckCircle2,
      tone: "bg-success-soft text-success",
      label: "Resolved",
      value: summary?.resolved ?? 0,
      sub: "Fixed and confirmed",
    },
    {
      icon: EyeOff,
      tone: "bg-background text-muted",
      label: "Ignored",
      value: summary?.ignored ?? 0,
      sub: "Deliberately not actioned",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cards.map((card) => (
        <div key={card.label} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
            <card.icon size={18} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">{card.label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-0.5 text-xs text-muted">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
