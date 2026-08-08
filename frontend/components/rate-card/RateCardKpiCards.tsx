import { Building2, ShieldCheck, LayoutGrid, History } from "lucide-react";

interface RateCardKpiCardsProps {
  totalStores: number;
  activeRateCards: number;
  rcTypeCount: number;
  rcTypeSample: string[];
  currentVersion: number | null;
}

export function RateCardKpiCards({
  totalStores,
  activeRateCards,
  rcTypeCount,
  rcTypeSample,
  currentVersion,
}: RateCardKpiCardsProps) {
  const cards = [
    {
      icon: Building2,
      iconTone: "bg-primary-soft text-primary",
      label: "Total Stores",
      value: totalStores.toLocaleString(),
      sub: "All configured stores",
    },
    {
      icon: ShieldCheck,
      iconTone: "bg-success-soft text-success",
      label: "Active Rate Cards",
      value: activeRateCards.toLocaleString(),
      sub: "Currently active",
    },
    {
      icon: LayoutGrid,
      iconTone: "bg-warning-soft text-warning",
      label: "RC Types",
      value: rcTypeCount.toString(),
      sub: rcTypeSample.length > 0 ? rcTypeSample.slice(0, 4).join(", ") : "None configured",
    },
    {
      icon: History,
      iconTone: "bg-primary-soft text-primary",
      label: "Current Version",
      value: currentVersion !== null ? `v${currentVersion}` : "—",
      sub: "Highest version this week",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.iconTone}`}>
            <card.icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{card.label}</p>
            <p className="mt-0.5 text-xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-0.5 truncate text-xs text-muted">{card.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
