import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Info,
  RefreshCcw,
  Settings2,
  Shield,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader, PageStatCard } from "@/shared/ui/PageHeader";
import { themeClasses } from "@/theme/themeClasses";

import {
  getCostsHealth,
  getIncreaseByMonth,
  getIncreaseByWeek,
  getTopDrivers,
  type IncreaseResponse,
  type TopDriversResponse,
} from "../api/costs";

type Props = {
  instance: IPublicClientApplication;
  defaultScope?: string;
  defaultMode?: "month" | "week";
  defaultWeeksWindow?: number;
  pollMs?: number | null;
};

type SortKey = "service" | "abs_change" | "pct_change" | "current" | "previous";

function cls(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function formatPct(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${(value * 100).toFixed(1)}%`;
}

function getSortableValue(item: IncreaseResponse["items"][number], key: SortKey): number | string {
  switch (key) {
    case "service":
      return item.service_name.toLowerCase();
    case "current":
      return item.current_cost;
    case "previous":
      return item.previous_cost;
    case "abs_change":
      return item.abs_change ?? 0;
    case "pct_change":
      return item.pct_change ?? 0;
  }
}

export default function CostsDashboard({
  instance,
  defaultScope,
  defaultMode = "month",
  defaultWeeksWindow = 2,
  pollMs = null,
}: Props) {
  const [mode, setMode] = useState<"month" | "week">(defaultMode);
  const [scope, setScope] = useState(defaultScope ?? "");
  const [weeksWindow, setWeeksWindow] = useState(defaultWeeksWindow);
  const [referenceDate, setReferenceDate] = useState("");
  const [referenceEnd, setReferenceEnd] = useState("");
  const [noCache, setNoCache] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [health, setHealth] = useState<{ ok: boolean; cache: string; ttl: number } | null>(null);
  const [increase, setIncrease] = useState<IncreaseResponse | null>(null);
  const [drivers, setDrivers] = useState<TopDriversResponse | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>("abs_change");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");

  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentHealth = await getCostsHealth(instance).catch(() => null);
      if (currentHealth) {
        setHealth(currentHealth);
      }

      const currentIncrease =
        mode === "month"
          ? await getIncreaseByMonth(instance, {
              scope: scope || undefined,
              referenceDate: referenceDate || undefined,
              noCache: noCache ? 1 : 0,
            })
          : await getIncreaseByWeek(instance, {
              scope: scope || undefined,
              weeksWindow,
              referenceEnd: referenceEnd || undefined,
              noCache: noCache ? 1 : 0,
            });

      const currentDrivers = await getTopDrivers(instance, {
        scope: scope || undefined,
        mode,
        weeksWindow,
        referenceDate: referenceDate || undefined,
        referenceEnd: referenceEnd || undefined,
        topN: 8,
        noCache: noCache ? 1 : 0,
      });

      setIncrease(currentIncrease);
      setDrivers(currentDrivers);
      setLastUpdated(new Date());
    } catch (caughtError: unknown) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Failed to load cost data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [instance, mode, noCache, referenceDate, referenceEnd, scope, weeksWindow]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!pollMs) {
      return;
    }

    pollRef.current = window.setInterval(() => {
      void load();
    }, pollMs);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
      }
      pollRef.current = null;
    };
  }, [load, pollMs]);

  const currency = increase?.currency || "CHF";

  const totalIncrease = useMemo(() => {
    if (!increase) {
      return 0;
    }

    return increase.items
      .map((item) => Math.max(0, item.abs_change || 0))
      .reduce((total, item) => total + item, 0);
  }, [increase]);

  const filteredSortedItems = useMemo(() => {
    let items = [...(increase?.items || [])];
    if (query.trim()) {
      const normalizedQuery = query.trim().toLowerCase();
      items = items.filter((item) => item.service_name.toLowerCase().includes(normalizedQuery));
    }

    items.sort((left, right) => {
      const leftValue = getSortableValue(left, sortKey);
      const rightValue = getSortableValue(right, sortKey);

      if (leftValue < rightValue) {
        return sortDir === "asc" ? -1 : 1;
      }
      if (leftValue > rightValue) {
        return sortDir === "asc" ? 1 : -1;
      }

      return 0;
    });

    return items;
  }, [increase, query, sortDir, sortKey]);

  const chartData = useMemo(() => {
    return (drivers?.drivers || [])
      .filter((driver) => (driver.abs_change || 0) > 0)
      .map((driver) => ({
        service: driver.service_name,
        change: driver.abs_change,
      }));
  }, [drivers]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "service" ? "asc" : "desc");
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Azure Cost Increase
            <span className="ui-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
              <Activity className="h-3 w-3" />
              {increase?.granularity || (mode === "month" ? "Monthly" : "Weekly")}
            </span>
          </span>
        }
        description={
          <>
            Period:{" "}
            {increase ? (
              <span>
                <strong>{increase.period_previous}</strong> to <strong>{increase.period_current}</strong>
              </span>
            ) : (
              "--"
            )}
            {lastUpdated ? (
              <>
                {" "}
                | Last updated: <time dateTime={lastUpdated.toISOString()}>{lastUpdated.toLocaleString()}</time>
              </>
            ) : null}
          </>
        }
        actions={
          <button
            onClick={() => void load()}
            className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5`}
            aria-label="Refresh"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <section className="ui-panel grid grid-cols-1 gap-3 rounded-2xl p-4 lg:grid-cols-12">
        <div className="flex flex-wrap items-center gap-2 lg:col-span-5">
          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border-subtle)]">
            <button
              className={cls(
                "px-3 py-1.5 text-sm",
                mode === "month"
                  ? "ui-button-primary"
                  : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
              )}
              onClick={() => setMode("month")}
            >
              Monthly
            </button>
            <button
              className={cls(
                "border-l border-[var(--border-subtle)] px-3 py-1.5 text-sm",
                mode === "week"
                  ? "ui-button-primary"
                  : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
              )}
              onClick={() => setMode("week")}
            >
              Weekly
            </button>
          </div>

          <div className="relative">
            <Settings2 className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
            <input
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              placeholder="/subscriptions/<id> or leave empty for default"
              className={`${themeClasses.field} w-80 rounded-lg py-1.5 pl-8 pr-3 text-sm`}
            />
          </div>

          <label className="ml-1 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              className="rounded"
              checked={noCache}
              onChange={(event) => setNoCache(event.target.checked)}
            />
            Bypass cache
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 lg:col-span-7 lg:justify-end">
          {mode === "month" ? (
            <input
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className={`${themeClasses.field} rounded-lg px-3 py-1.5 text-sm`}
              aria-label="Reference date (any day in current month)"
              title="Reference date (YYYY-MM-DD in the current month)"
            />
          ) : (
            <>
              <div className="inline-flex items-center gap-2">
                <label className="text-xs text-[var(--text-secondary)]">Weeks window</label>
                <select
                  value={weeksWindow}
                  onChange={(event) => setWeeksWindow(Number(event.target.value))}
                  className={`${themeClasses.select} rounded-lg px-2 py-1.5 text-sm`}
                >
                  {[1, 2, 3, 4, 6, 8].map((weeks) => (
                    <option key={weeks} value={weeks}>
                      {weeks}
                    </option>
                  ))}
                </select>
              </div>
              <div className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="date"
                  value={referenceEnd}
                  onChange={(event) => setReferenceEnd(event.target.value)}
                  className={`${themeClasses.field} rounded-lg px-3 py-1.5 text-sm`}
                  aria-label="Reference end (exclusive)"
                  title="Reference end (YYYY-MM-DD, exclusive)"
                />
              </div>
            </>
          )}

          <div className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by service..."
              className={`${themeClasses.field} w-56 rounded-lg px-3 py-1.5 text-sm`}
            />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <PageStatCard
          label="Total increase"
          value={
            <span className="flex items-center gap-2">
              <strong>{formatCurrency(totalIncrease, currency)}</strong>
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </span>
          }
          detail={increase ? `${increase.period_previous} to ${increase.period_current}` : "--"}
        />

        <PageStatCard label="Currency" value={currency} detail="From API response" />

        <div className="ui-panel rounded-2xl p-4">
          <div className="flex items-center gap-1 text-xs ui-text-muted">
            <Shield className="h-4 w-4" /> Cache
          </div>
          <div className="mt-2 text-sm">
            <span className="ui-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5">
              {health?.cache ?? "--"}
            </span>
            <span className="ml-2 text-xs ui-text-muted">TTL: {health?.ttl ?? "--"}s</span>
          </div>
          <div className="mt-1 text-[11px] ui-text-muted">
            {noCache ? "Bypassing cache" : "Using server-side cache"}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="ui-panel rounded-2xl p-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-[var(--text-primary)]">Top increase drivers</div>
            <div className="flex items-center gap-1 text-xs ui-text-muted">
              <Info className="h-3.5 w-3.5" />
              Positive absolute change only
            </div>
          </div>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="color-mix(in srgb, var(--text-muted) 24%, transparent)" />
                <XAxis
                  dataKey="service"
                  angle={-20}
                  textAnchor="end"
                  height={50}
                  interval={0}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value, currency)}
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "16px",
                    color: "var(--text-primary)",
                  }}
                  formatter={(value: number) => [formatCurrency(value, currency), "Increase"]}
                  labelFormatter={(label) => String(label)}
                />
                <Bar dataKey="change" fill="var(--accent-primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="ui-panel overflow-hidden rounded-2xl p-4 xl:col-span-3">
          <div className="mb-2 text-sm font-medium text-[var(--text-primary)]">Services breakdown</div>
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--surface-panel-muted)]">
                <tr>
                  <Th
                    label="Service"
                    active={sortKey === "service"}
                    dir={sortDir}
                    onClick={() => onSort("service")}
                  />
                  <Th
                    label="Current"
                    active={sortKey === "current"}
                    dir={sortDir}
                    onClick={() => onSort("current")}
                  />
                  <Th
                    label="Previous"
                    active={sortKey === "previous"}
                    dir={sortDir}
                    onClick={() => onSort("previous")}
                  />
                  <Th
                    label="Abs Delta"
                    active={sortKey === "abs_change"}
                    dir={sortDir}
                    onClick={() => onSort("abs_change")}
                  />
                  <Th
                    label="% Delta"
                    active={sortKey === "pct_change"}
                    dir={sortDir}
                    onClick={() => onSort("pct_change")}
                  />
                  <th className="px-3 py-2 text-left text-[var(--text-muted)]">Share</th>
                </tr>
              </thead>
              <tbody>
                {filteredSortedItems.map((item) => {
                  const isIncrease = (item.abs_change || 0) >= 0;
                  const share = item.share_of_increase_pct ?? 0;

                  return (
                    <tr key={item.service_name} className="border-t border-[var(--border-subtle)]">
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-[var(--text-primary)]">
                        {item.service_name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">
                        {formatCurrency(item.current_cost, currency)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-[var(--text-secondary)]">
                        {formatCurrency(item.previous_cost, currency)}
                      </td>
                      <td
                        className={cls(
                          "whitespace-nowrap px-3 py-2 font-medium",
                          isIncrease ? "text-emerald-300" : "text-red-400",
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {isIncrease ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {formatCurrency(item.abs_change, currency)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={cls(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                            item.pct_change !== null && (item.pct_change || 0) > 0
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-[var(--surface-panel-muted)] text-[var(--text-secondary)]",
                          )}
                        >
                          {item.pct_change !== null ? formatPct(item.pct_change) : "--"}
                        </span>
                      </td>
                      <td className="w-48 px-3 py-2">
                        <div className="h-2 w-full rounded bg-[var(--surface-panel-muted)]">
                          <div
                            className="h-2 rounded bg-[var(--accent-primary)]"
                            style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }}
                            aria-label={`Share of increase ${formatPct(share)}`}
                            title={`Share of increase ${formatPct(share)}`}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filteredSortedItems.length && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center ui-text-muted">
                      No data to display.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}
        </section>
      </div>

      {loading ? (
        <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading...</div>
      ) : null}
    </div>
  );
}

function Th({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th
      className={cls(
        "select-none px-3 py-2 text-left text-xs uppercase tracking-wider",
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]",
      )}
    >
      <button onClick={onClick} className="inline-flex items-center gap-1">
        {label}
        {active ? <span aria-hidden className="text-[10px]">{dir === "asc" ? "^" : "v"}</span> : null}
      </button>
    </th>
  );
}
