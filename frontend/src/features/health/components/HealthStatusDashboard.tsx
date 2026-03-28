import React, { useEffect, useMemo, useRef, useState } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash2,
  Info,
  RefreshCcw,
  Timer,
  XCircle,
} from "lucide-react";

import FilterChip from "@/shared/ui/FilterChip";
import { themeClasses } from "@/theme/themeClasses";

import { getLiveness, getReadiness, type CheckResult, type HealthResponse } from "../api/health_status";

type Props = {
  instance: IPublicClientApplication;
  pollMs?: number;
};

type Filter = "all" | "pass" | "degraded_or_skip" | "fail";

const STATUS_ORDER: Record<string, number> = { fail: 0, degraded: 1, skip: 1, pass: 2 };

export default function HealthStatusDashboard({ instance, pollMs = 30000 }: Props) {
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      await getLiveness(instance).catch(() => null);
      const readiness = await getReadiness(instance);
      setHealth(readiness);
      setLastUpdated(new Date());
    } catch (error: any) {
      setHealth({
        status: "fail",
        results: [
          {
            name: "api",
            status: "fail",
            error: error?.message || "Failed to reach readiness endpoint",
          },
        ],
      });
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh) {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
      pollRef.current = null;
      return;
    }

    pollRef.current = window.setInterval(load, pollMs) as unknown as number;
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
      pollRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, pollMs]);

  const overall = health?.status ?? "degraded";
  const overallUi = getOverallUi(overall);

  const filteredResults = useMemo(() => {
    let results = [...(health?.results || [])];
    if (filter === "pass") {
      results = results.filter((result) => result.status === "pass");
    } else if (filter === "fail") {
      results = results.filter((result) => result.status === "fail");
    } else if (filter === "degraded_or_skip") {
      results = results.filter((result) => result.status === "skip" || result.status === "fail");
    }

    results.sort(
      (left, right) => STATUS_ORDER[left.status] - STATUS_ORDER[right.status] || left.name.localeCompare(right.name),
    );
    return results;
  }, [filter, health]);

  return (
    <div className="ui-panel rounded-2xl p-4">
      {loading ? <div className="h-1 animate-pulse bg-indigo-500" /> : <div className="h-1" />}

      <div
        className={`mt-4 mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${overallUi.container} ${overallUi.border}`}
        role="status"
        aria-live="polite"
      >
        <overallUi.Icon className={`h-5 w-5 ${overallUi.icon}`} aria-hidden />
        <div className="flex-1">
          <div className="text-sm font-semibold text-[var(--text-primary)]">{overallUi.title}</div>
          <div className="text-xs opacity-80">
            {overallUi.message}
            {lastUpdated ? (
              <>
                {" "} | Last updated:{" "}
                <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleString()}</time>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              className="rounded"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              aria-label="Toggle auto refresh"
            />
            Auto refresh (30s)
          </label>
          <button
            onClick={load}
            className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded px-3 py-1.5 focus:outline-none`}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm text-[var(--text-secondary)]">Filter:</span>
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        <FilterChip active={filter === "fail"} onClick={() => setFilter("fail")} label="Down" />
        <FilterChip
          active={filter === "degraded_or_skip"}
          onClick={() => setFilter("degraded_or_skip")}
          label="Degraded/Skipped"
        />
        <FilterChip active={filter === "pass"} onClick={() => setFilter("pass")} label="Operational" />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filteredResults.map((result) => (
          <ServiceCard key={result.name} item={result} />
        ))}
        {!filteredResults.length ? (
          <div className="col-span-full py-6 text-center text-sm ui-text-muted">No services to display.</div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs ui-text-muted">
        <span className="inline-flex items-center gap-1"><StatusDot kind="pass" /> Operational</span>
        <span className="inline-flex items-center gap-1"><StatusDot kind="degraded" /> Degraded</span>
        <span className="inline-flex items-center gap-1"><StatusDot kind="fail" /> Down</span>
        <span className="inline-flex items-center gap-1"><StatusDot kind="skip" /> Skipped</span>
      </div>
    </div>
  );
}

function ServiceCard({ item }: { item: CheckResult }) {
  const ui = getItemUi(item.status);
  const [open, setOpen] = useState(false);

  return (
    <div className={`ui-panel overflow-hidden rounded-2xl ${ui.border}`} aria-labelledby={`svc-${item.name}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <ui.Icon className={`h-5 w-5 ${ui.icon}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div id={`svc-${item.name}`} className="truncate text-sm font-medium text-[var(--text-primary)]">
            {item.name}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${ui.pillBg} ${ui.pillText}`}>
              <StatusDot kind={item.status === "skip" ? "skip" : (item.status as any)} />
              {item.status === "pass"
                ? "Operational"
                : item.status === "fail"
                  ? "Down"
                  : item.status === "skip"
                    ? "Skipped"
                    : "Degraded"}
            </span>
            {typeof item.latency_ms === "number" ? (
              <span className="inline-flex items-center gap-1 rounded bg-[var(--surface-panel-muted)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)]">
                <Timer className="h-3 w-3" />
                {Math.round(item.latency_ms)} ms
              </span>
            ) : null}
          </div>
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          className={`${themeClasses.buttonSecondary} inline-flex items-center gap-1 rounded px-2 py-1 text-xs focus:outline-none`}
          aria-expanded={open}
          aria-controls={`svc-details-${item.name}`}
        >
          <Info className="h-4 w-4" />
          Details
        </button>
      </div>

      <div id={`svc-details-${item.name}`} className={`${open ? "block" : "hidden"} ui-divider border-t`}>
        <div className="space-y-2 px-4 py-3 text-xs text-[var(--text-primary)]">
          {item.error ? (
            <div className="text-red-400">
              <strong>Error:</strong> {item.error}
            </div>
          ) : null}
          <div className="max-h-60 overflow-auto rounded border border-[var(--border-subtle)]">
            <pre className="whitespace-pre-wrap break-words p-3 text-[11px] leading-5">
              {JSON.stringify(
                { status: item.status, latency_ms: item.latency_ms, error: item.error, details: item.details ?? {} },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusDot({ kind }: { kind: "pass" | "degraded" | "fail" | "skip" }) {
  const cls =
    kind === "pass" ? "bg-emerald-500" : kind === "degraded" ? "bg-amber-500" : kind === "fail" ? "bg-red-500" : "bg-gray-400";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${cls}`} aria-hidden />;
}

function getOverallUi(status: "pass" | "fail" | "degraded") {
  if (status === "pass") {
    return {
      Icon: CheckCircle2,
      title: "All systems operational",
      message: "No issues detected across dependent services.",
      container: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      icon: "text-emerald-300",
    };
  }
  if (status === "degraded") {
    return {
      Icon: AlertTriangle,
      title: "Partial degradation",
      message: "Some checks were skipped or are experiencing minor issues.",
      container: "bg-amber-500/10",
      border: "border-amber-500/30",
      icon: "text-amber-300",
    };
  }
  return {
    Icon: XCircle,
    title: "Service disruption",
    message: "One or more critical checks are failing.",
    container: "bg-red-500/10",
    border: "border-red-500/30",
    icon: "text-red-300",
  };
}

function getItemUi(status: CheckResult["status"]) {
  if (status === "pass") {
    return {
      Icon: CheckCircle2,
      border: "border-emerald-500/30",
      icon: "text-emerald-300",
      pillBg: "bg-emerald-500/10",
      pillText: "text-emerald-300",
    };
  }
  if (status === "fail") {
    return {
      Icon: XCircle,
      border: "border-red-500/30",
      icon: "text-red-300",
      pillBg: "bg-red-500/10",
      pillText: "text-red-300",
    };
  }
  if (status === "skip") {
    return {
      Icon: CircleSlash2,
      border: "border-[var(--border-subtle)]",
      icon: "text-[var(--text-secondary)]",
      pillBg: "bg-[var(--surface-panel-muted)]",
      pillText: "text-[var(--text-secondary)]",
    };
  }
  return {
    Icon: AlertTriangle,
    border: "border-amber-500/30",
    icon: "text-amber-300",
    pillBg: "bg-amber-500/10",
    pillText: "text-amber-300",
  };
}
