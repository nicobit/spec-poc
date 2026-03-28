import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMsal } from "@azure/msal-react";

import HealthConfigManager from "@/features/health/components/HealthConfigManager";
import { PageHeader } from "@/shared/ui/PageHeader";

type SettingsTab = "health" | "general";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { instance } = useMsal();
  const [activeTab, setActiveTab] = useState<SettingsTab>("health");

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "health", label: t("healthConfig", { defaultValue: "Health Config" }) },
    { id: "general", label: t("generalSettings", { defaultValue: "General" }) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("settings", { defaultValue: "Settings" })}
        description={t("settingsDescription", {
          defaultValue:
            "Manage operational configuration and shared platform settings from one place.",
        })}
      />

      <div className="ui-divider border-b">
        <nav
          className="-mb-px flex gap-4"
          aria-label={t("settingsTabs", { defaultValue: "Settings tabs" })}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus:outline-none",
                  isActive
                    ? "border-[var(--accent-primary)] text-[var(--accent-primary)]"
                    : "border-transparent text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {activeTab === "health" && (
        <section aria-labelledby="health-tab" className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("healthConfigDescription", {
              defaultValue:
                "Manage health check configuration. Add, edit, or remove services; updates are versioned with ETags.",
            })}
          </p>
          <HealthConfigManager instance={instance} />
        </section>
      )}

      {activeTab === "general" && (
        <section className="ui-panel rounded-2xl p-6 text-sm text-[var(--text-secondary)]">
          {t("generalSettingsPlaceholder", {
            defaultValue: "General settings will appear here.",
          })}
        </section>
      )}
    </div>
  );
}
