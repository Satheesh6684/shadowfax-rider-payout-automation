"use client";

import { Download, FileSpreadsheet, History, Plus, Search } from "lucide-react";
import { City } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export interface RateCardFilterValues {
  weekStartDate: string;
  city: string;
  rcType: string;
  mgType: string;
  status: string;
  search: string;
}

interface RateCardFiltersProps {
  values: RateCardFilterValues;
  onChange: (values: RateCardFilterValues) => void;
  cities: City[];
  rcTypes: string[];
  mgTypes: string[];
  onCreateNew: () => void;
  onCreateNewWeek: () => void;
  onLockWeek: () => void;
  onExportCsv: () => void;
  onExportExcel: () => void;
  onViewVersionHistory: () => void;
  isWeekLocked: boolean;
  hasResults: boolean;
}

const selectClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary";
const fieldLabelClass = "mb-1 block text-xs font-medium text-muted";

export function RateCardFilters({
  values,
  onChange,
  cities,
  rcTypes,
  mgTypes,
  onCreateNew,
  onCreateNewWeek,
  onLockWeek,
  onExportCsv,
  onExportExcel,
  onViewVersionHistory,
  isWeekLocked,
  hasResults,
}: RateCardFiltersProps) {
  function set<K extends keyof RateCardFilterValues>(key: K, value: RateCardFilterValues[K]) {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <label className={fieldLabelClass}>Search Store</label>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted">
            <Search size={14} />
            <input
              type="text"
              value={values.search}
              onChange={(e) => set("search", e.target.value)}
              placeholder="Search by code or name…"
              className="w-full bg-transparent outline-none placeholder:text-muted"
            />
          </div>
        </div>

        <div>
          <label className={fieldLabelClass}>City Filter</label>
          <select value={values.city} onChange={(e) => set("city", e.target.value)} className={selectClass}>
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.name}>
                {city.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>RC Type</label>
          <select value={values.rcType} onChange={(e) => set("rcType", e.target.value)} className={selectClass}>
            <option value="">All RC Types</option>
            {rcTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>MG Type</label>
          <select value={values.mgType} onChange={(e) => set("mgType", e.target.value)} className={selectClass}>
            <option value="">All MG Types</option>
            {mgTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={fieldLabelClass}>Store Status</label>
          <select value={values.status} onChange={(e) => set("status", e.target.value)} className={selectClass}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="LOCKED">Locked</option>
          </select>
        </div>

        <div>
          <label className={fieldLabelClass}>Week Selector</label>
          <input
            type="date"
            value={values.weekStartDate}
            onChange={(e) => set("weekStartDate", e.target.value)}
            className={selectClass}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button onClick={onCreateNewWeek}>
          <Plus size={14} /> Create New Week
        </Button>
        <Button variant="secondary" onClick={onCreateNew} disabled={isWeekLocked}>
          <Plus size={14} /> New Rate Card
        </Button>
        <Button variant="secondary" onClick={onExportCsv} disabled={!hasResults}>
          <Download size={14} /> Export CSV
        </Button>
        <Button variant="secondary" onClick={onExportExcel} disabled={!hasResults}>
          <FileSpreadsheet size={14} /> Export Excel
        </Button>
        <Button variant="secondary" onClick={onViewVersionHistory}>
          <History size={14} /> Version History
        </Button>
        <Button variant="secondary" onClick={onLockWeek} disabled={isWeekLocked || !hasResults}>
          {isWeekLocked ? "Week Locked" : "Lock Week"}
        </Button>
      </div>
    </div>
  );
}
