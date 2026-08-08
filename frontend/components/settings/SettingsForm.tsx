"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { usePermission } from "@/lib/hooks/usePermission";
import { settingsApi } from "@/lib/api/settings";
import { AppSettings } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { DetailSection } from "@/components/rate-card/DetailSection";
import { Settings2, Calculator, UploadCloud, ShieldCheck, FileSpreadsheet, Bell } from "lucide-react";

const inputClass = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const rowClass = "flex items-center justify-between gap-3";
const labelClass = "text-xs text-muted";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-primary" : "bg-border"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsForm() {
  const { token } = useAuth();
  const { showSuccess, showError } = useToast();
  const canManageSettings = usePermission("settings:manage");
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    settingsApi
      .get(token)
      .then(setSettings)
      .catch((err) => showError(err instanceof ApiError ? err.message : "Couldn't load settings."))
      .finally(() => setIsLoading(false));
  }, [token, showError]);

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!canManageSettings) {
      showError("Your role doesn't have permission to change settings.");
      return;
    }
    if (!settings || !token) return;
    setIsSaving(true);
    try {
      const updated = await settingsApi.update(settings, token);
      setSettings(updated);
      showSuccess("Settings saved.");
    } catch (err) {
      showError(err instanceof ApiError ? err.message : "Couldn't save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading || !settings) {
    return <div className="rounded-xl border border-border bg-surface p-8 text-sm text-muted shadow-soft">Loading settings…</div>;
  }

  return (
    <div className="space-y-4">
      {!canManageSettings && (
        <p className="rounded-lg border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          Your role has read-only access to settings.
        </p>
      )}
      <fieldset disabled={!canManageSettings} className="space-y-4">
      <DetailSection icon={Settings2} iconTone="bg-primary-soft text-primary" title="General Settings">
        <div className={rowClass}>
          <label className={labelClass}>Organization Name</label>
          <input
            value={settings.organizationName}
            onChange={(e) => set("organizationName", e.target.value)}
            className={`${inputClass} max-w-[180px]`}
          />
        </div>
        <div className={rowClass}>
          <label className={labelClass}>Default Currency</label>
          <input
            value={settings.defaultCurrency}
            onChange={(e) => set("defaultCurrency", e.target.value)}
            className={`${inputClass} max-w-[100px]`}
          />
        </div>
      </DetailSection>

      <DetailSection icon={Calculator} iconTone="bg-success-soft text-success" title="Calculation Settings">
        <div className={rowClass}>
          <label className={labelClass}>Rounding Precision (decimals)</label>
          <input
            type="number"
            min={0}
            max={4}
            value={settings.defaultRoundingPrecision}
            onChange={(e) => set("defaultRoundingPrecision", Number(e.target.value))}
            className={`${inputClass} max-w-[80px]`}
          />
        </div>
        <div className={rowClass}>
          <label className={labelClass}>Rounding Mode</label>
          <select
            value={settings.defaultRoundingMode}
            onChange={(e) => set("defaultRoundingMode", e.target.value as AppSettings["defaultRoundingMode"])}
            className={`${inputClass} max-w-[160px]`}
          >
            <option value="HALF_UP">Half Up</option>
            <option value="HALF_DOWN">Half Down</option>
            <option value="CEILING">Ceiling</option>
            <option value="FLOOR">Floor</option>
          </select>
        </div>
      </DetailSection>

      <DetailSection icon={UploadCloud} iconTone="bg-warning-soft text-warning" title="Upload Settings">
        <div className={rowClass}>
          <label className={labelClass}>Max Upload Size (MB)</label>
          <input
            type="number"
            min={1}
            max={200}
            value={settings.maxUploadSizeMb}
            onChange={(e) => set("maxUploadSizeMb", Number(e.target.value))}
            className={`${inputClass} max-w-[80px]`}
          />
        </div>
        <div className={rowClass}>
          <label className={labelClass}>Allowed Formats</label>
          <input
            value={settings.allowedUploadFormats}
            onChange={(e) => set("allowedUploadFormats", e.target.value)}
            className={`${inputClass} max-w-[160px]`}
          />
        </div>
      </DetailSection>

      <DetailSection icon={ShieldCheck} iconTone="bg-danger-soft text-danger" title="Validation Settings">
        <div className={rowClass}>
          <label className={labelClass}>Block calculation if validation fails</label>
          <Toggle
            checked={settings.blockCalculationOnValidationFailure}
            onChange={(v) => set("blockCalculationOnValidationFailure", v)}
          />
        </div>
      </DetailSection>

      <DetailSection icon={FileSpreadsheet} iconTone="bg-primary-soft text-primary" title="Report Settings">
        <div className={rowClass}>
          <label className={labelClass}>Default Report Format</label>
          <select
            value={settings.defaultReportFormat}
            onChange={(e) => set("defaultReportFormat", e.target.value as AppSettings["defaultReportFormat"])}
            className={`${inputClass} max-w-[120px]`}
          >
            <option value="XLSX">Excel (XLSX)</option>
            <option value="CSV">CSV</option>
            <option value="PDF">PDF</option>
          </select>
        </div>
      </DetailSection>

      <DetailSection icon={Bell} iconTone="bg-warning-soft text-warning" title="Notification Settings">
        {(
          [
            ["notifyOnUploadSuccess", "Notify on upload success"],
            ["notifyOnUploadFailure", "Notify on upload failure"],
            ["notifyOnValidationComplete", "Notify on validation complete"],
            ["notifyOnCalculationComplete", "Notify on calculation complete"],
            ["notifyOnReportGenerated", "Notify on report generated"],
          ] as [keyof AppSettings, string][]
        ).map(([key, label]) => (
          <div key={key} className={rowClass}>
            <label className={labelClass}>{label}</label>
            <Toggle checked={settings[key] as boolean} onChange={(v) => set(key, v as never)} />
          </div>
        ))}
      </DetailSection>
      </fieldset>

      <div className="flex justify-end">
        <Button onClick={handleSave} isLoading={isSaving} disabled={!canManageSettings}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
