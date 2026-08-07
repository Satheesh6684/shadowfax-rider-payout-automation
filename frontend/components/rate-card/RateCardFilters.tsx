"use client";

import { Download, FileSpreadsheet, Plus, Search } from "lucide-react";
import { City } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export interface RateCardFilterValues {
  weekStartDate: string;
  city: string;
  rcType: string;
  status: string;
  search: string;
}

interface RateCardFiltersProps {
  values: RateCardFilterValues;
  onChange: (values: RateCardFilterValues) => void;
  cities: City[];
  rcTypes: string[];
  onCreateNew: () => void;
  onCopyWeek: () => void;
  onLockWeek: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  isWeekLocked: boolean;
  hasResults: boolean;
}

const selectClass =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";

export function RateCardFilters({
  values,
  onChange,
  cities,
  rcTypes,
  onCreateNew,
  onCopyWeek,
  onLockWeek,
  onExportCsv,
  onExportExcel,
  isWeekLocked,
  hasResults,
}: RateCardFiltersProps) {
  function set<K extends keyof RateCardFilterValues>(key: K, value: RateCardFilterValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={values.weekStartDate}
            onChange={(e) => set("weekStartDate", e.target.value)}
            className={selectClass}
          />
          <select value={values.city} onChange={(e) => set("city", e.target.value)} className={selectClass}>
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
          <select value={values.rcType} onChange={(e) => set("rcType", e.target.value)} className={selectClass}>
            <option value="">All RC Types</option>
            {rcTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select value={values.status} onChange={(e) => set("status", e.target.value)} className={selectClass}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onExportCsv} disabled={!hasResults}>
            <Download size={14} /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={onExportExcel} disabled={!hasResults}>
            <FileSpreadsheet size={14} /> Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={onCopyWeek}>
            Copy Previous Week
          </Button>
          <Button variant="secondary" size="sm" onClick={onLockWeek} disabled={isWeekLocked || !hasResults}>
            {isWeekLocked ? "Week Locked" : "Lock Week"}
          </Button>
          <Button size="sm" onClick={onCreateNew} disabled={isWeekLocked}>
            <Plus size={14} /> New Rate Card
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted">
        <Search size={15} />
        <input
          type="text"
          value={values.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search by store, store code, or city…"
          className="w-full bg-transparent outline-none placeholder:text-muted"
        />
      </div>
    </div>
  );
}
