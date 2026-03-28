import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useTranslation } from "react-i18next";

import { useTheme } from "@/contexts/ThemeContext";
import TokenUsageDashboard from "@/features/user/components/TokenUsageDashboard";
import AccountRoles from "@/features/user/components/AccountRoles";
import { themeClasses } from "@/theme/themeClasses";

type TabKey = "usage" | "future1" | "future2";

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("usage");
  const { instance } = useMsal();
  const { availableThemes, darkMode, mode, setMode, setThemeId, themeId } = useTheme();
  const { t, i18n } = useTranslation();

  const changeLanguage = (language: string) => i18n.changeLanguage(language);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">
        {t("users", { defaultValue: "Users" })}
      </h2>

      <div className="ui-panel space-y-4 rounded-2xl p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              {t("theme", { defaultValue: "Theme family" })}
            </label>
            <select
              onChange={(event) => setThemeId(event.target.value as typeof themeId)}
              className={`${themeClasses.select} block w-full rounded-lg p-2`}
              value={themeId}
            >
              {availableThemes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              {t("themeMode", { defaultValue: "Theme mode" })}
            </label>
            <select
              onChange={(event) => setMode(event.target.value === "dark" ? "dark" : "light")}
              className={`${themeClasses.select} block w-full rounded-lg p-2`}
              value={mode}
            >
              <option value="light">light</option>
              <option value="dark">dark</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
              {t("language", { defaultValue: "Language" })}
            </label>
            <select
              onChange={(event) => changeLanguage(event.target.value)}
              className={`${themeClasses.select} block w-full rounded-lg p-2`}
              defaultValue={i18n.language}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-4 py-3 text-sm ui-text-muted">
          Active theme: <span className="font-medium text-[var(--text-primary)]">{themeId}</span> /{" "}
          <span className="font-medium text-[var(--text-primary)]">{darkMode ? "dark" : "light"}</span>.
          New themes should be added through theme tokens and shared UI primitives, not page-level restyling.
        </div>
      </div>

      <div className="mt-2">
        <div
          role="tablist"
          aria-label={t("userTools", { defaultValue: "User tools" })}
          className="border-b border-gray-200 dark:border-gray-800"
        >
          <div className="flex gap-2">
            <TabButton
              active={activeTab === "usage"}
              onClick={() => setActiveTab("usage")}
              label={t("tokenUsage", { defaultValue: "Token Usage" })}
            />
            <TabButton
              active={activeTab === "future1"}
              onClick={() => setActiveTab("future1")}
              label={t("futureSettings", { defaultValue: "(Future) Settings" })}
              disabled
            />
            <TabButton
              active={activeTab === "future2"}
              onClick={() => setActiveTab("future2")}
              label={t("futureAudit", { defaultValue: "(Future) Audit" })}
              disabled
            />
          </div>
        </div>

        <div className="mt-4">
          {activeTab === "usage" && (
            <>
              {instance ? (
                <>
                  <TokenUsageDashboard instance={instance} defaultDays={14} />
                  <div className="mt-4">
                    <AccountRoles />
                  </div>
                </>
              ) : (
                <div className="rounded border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                  {t("msalInstanceMissing", {
                    defaultValue:
                      "Cannot find MSAL instance. If you’re not using @azure/msal-react, pass your IPublicClientApplication to TokenUsageDashboard via props.",
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === "future1" && (
            <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
              {t("futureSettingsPlaceholder", {
                defaultValue: "Placeholder for future “Settings” tab.",
              })}
            </div>
          )}

          {activeTab === "future2" && (
            <div className="rounded-lg border border-gray-200 p-6 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
              {t("futureAuditPlaceholder", {
                defaultValue: "Placeholder for future “Audit” tab.",
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  disabled = false,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="tab"
      aria-selected={!!active}
      onClick={onClick}
      disabled={disabled}
      className={[
        "relative -mb-px border-b-2 px-3 py-2 text-sm transition-colors focus:outline-none",
        active
          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
          : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:text-white",
        disabled && "cursor-not-allowed opacity-50",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
