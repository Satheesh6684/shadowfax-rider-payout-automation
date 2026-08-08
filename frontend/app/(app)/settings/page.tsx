"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { UsersManagement } from "@/components/settings/UsersManagement";

type Tab = "settings" | "users";

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("settings");
  const isAdmin = user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Application configuration and user management.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab("settings")}
          className={`px-4 py-2 text-sm font-medium ${tab === "settings" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
        >
          Application Settings
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 text-sm font-medium ${tab === "users" ? "border-b-2 border-primary text-primary" : "text-muted"}`}
          >
            User Management
          </button>
        )}
      </div>

      {tab === "settings" ? <SettingsForm /> : <UsersManagement />}
    </div>
  );
}
