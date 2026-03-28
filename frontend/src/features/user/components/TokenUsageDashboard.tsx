import React, { useEffect, useMemo, useState } from "react";
import { IPublicClientApplication } from "@azure/msal-browser";
import { enqueueSnackbar } from "notistack";
import {
  getUsageToday,
  getUsageRange,
  type UsageDayRow,
  type UsageRange,
} from "@/features/user/api/llmproxy";
import {
  Activity,
  RefreshCcw,
  CalendarDays,
  Download,
  TrendingUp,
  Info,
} from "lucide-react";

/* --------------------------------- Utils --------------------------------- */

function formatNum(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "0";
  return new Intl.NumberFormat().format(n);
}
function toISODate(d: Date): string {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}
function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

/* ------------------------------ Sparkline SVG ----------------------------- */

function Sparkline({
  data,
  width = 480,
  height = 60,
  strokeWidth = 2,
  padding = 4,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  strokeWidth?: number;
  padding?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data);
  const min = Math.min(0, ...data);
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * innerW + padding;
    const y = height - padding - ((v - min) / Math.max(1, max - min)) * innerH;
    return [x, y];
  });

  const d = pts
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");

  return (
    <svg width={width} height={height} className={className} role="img" aria-label="Usage sparkline">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={strokeWidth} />
    </svg>
  );
}

/* ------------------------------ Progress Bar ------------------------------ */

function Progress({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  const tone =
    pct < 60 ? "bg-emerald-500" : pct < 85 ? "bg-amber-500" : "bg-red-500";

  return (
    <div>
      {label && (
        <div className="mb-1 text-xs text-gray-600 dark:text-gray-300">{label}</div>
      )}
      <div className="h-2 rounded bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div
          className={classNames("h-2 rounded", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
        {formatNum(value)} / {formatNum(max)} tokens ({pct.toFixed(0)}%)
      </div>
    </div>
  );
}

/* --------------------------- CSV Export (client) -------------------------- */

function rowsToCsv(rows: UsageDayRow[]) {
  const head = ["date", "prompt_tokens", "completion_tokens", "total_tokens", "quota", "model"];
  const lines = [head.join(",")];
  for (const r of rows) {
    const d = r.RowKey; // YYYYMMDD
    const iso = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    lines.push(
      [
        iso,
        r.prompt_tokens ?? 0,
        r.completion_tokens ?? 0,
        r.total_tokens ?? 0,
        r.quota ?? "",
        (r.model ?? "").toString().replaceAll(",", " "),
      ].join(",")
    );
  }
  return lines.join("\n");
}

function downloadCsv(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* -------------------------- Main Dashboard Component -------------------------- */

export default function TokenUsageDashboard({
  instance,
  defaultDays = 14,
}: {
  instance: IPublicClientApplication;
  defaultDays?: number;
}) {
  const [loading, setLoading] = useState(false);
  const [today, setToday] = useState<UsageDayRow | null>(null);
  const [range, setRange] = useState<UsageRange | null>(null);

  // Dates
  const now = new Date();
  const initialTo = toISODate(now);
  const initialFrom = toISODate(new Date(now.getTime() - (defaultDays - 1) * 86400000));
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const reload = async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        getUsageToday(instance),
        getUsageRange(instance, fromDate, toDate),
      ]);
      setToday(t);
      setRange(r);
    } catch (e: any) {
      enqueueSnackbar(`Failed to load usage: ${e?.message || e}`, { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    const daily = range?.daily ?? [];
    const tot = daily.reduce(
      (acc: { prompt: number; compl: number; total: number }, r: UsageDayRow) => {
        acc.prompt += Number(r.prompt_tokens || 0);
        acc.compl += Number(r.completion_tokens || 0);
        acc.total += Number(r.total_tokens || 0);
        return acc;
      },
      { prompt: 0, compl: 0, total: 0 }
    );
    const peak = daily.reduce(
      (m: UsageDayRow, r: UsageDayRow) => (r.total_tokens > m.total_tokens ? r : m),
      daily[0] || {
        RowKey: "",
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
        quota: 0,
        PartitionKey: "",
      }
    );
    const avg = daily.length ? Math.round(tot.total / daily.length) : 0;
    const dataForSpark = daily.map((r: UsageDayRow) => r.total_tokens || 0);
    return { ...tot, avg, peak, dataForSpark, days: daily.length };
  }, [range]);

  const onExportCsv = () => {
    if (!range?.daily?.length) {
      enqueueSnackbar("No data to export.", { variant: "info" });
      return;
    }
    const csv = rowsToCsv(range.daily);
    downloadCsv(`usage_${fromDate}_to_${toDate}.csv`, csv);
  };

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
      {/* Loading bar */}
      {loading ? <div className="h-1 bg-indigo-600 dark:bg-indigo-500 animate-pulse" /> : <div className="h-1" />}

      {/* Header */}
      <div className="mt-4 mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Token Usage
        </h2>

        {/* Push controls to right */}
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              From
            </label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1">
              <CalendarDays className="w-4 h-4" />
              To
            </label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={initialTo}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-800 text-sm"
            />
          </div>

          <button
            onClick={reload}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none"
          >
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={onExportCsv}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-500 dark:hover:bg-indigo-400 focus:outline-none"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Today */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Today</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatNum(today?.total_tokens)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">tokens</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Prompt</div>
              <div className="font-medium">{formatNum(today?.prompt_tokens)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Completion</div>
              <div className="font-medium">{formatNum(today?.completion_tokens)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Quota</div>
              <div className="font-medium">{formatNum(today?.quota)}</div>
            </div>
          </div>
          <div className="mt-3">
            <Progress
              value={Number(today?.total_tokens || 0)}
              max={Number(today?.quota || 0) || 1}
              label="Daily quota usage"
            />
          </div>
          <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 inline-flex items-center gap-1">
            <Info className="w-3.5 h-3.5" />
            Quota resets daily (UTC).
          </div>
        </div>

        {/* Range summary */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Range totals</div>
          <div className="text-2xl font-semibold text-gray-900 dark:text-white">
            {formatNum(range?.total_tokens)} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">tokens</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Prompt</div>
              <div className="font-medium">{formatNum(range?.total_prompt_tokens)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Completion</div>
              <div className="font-medium">{formatNum(range?.total_completion_tokens)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Days</div>
              <div className="font-medium">{totals.days || 0}</div>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 inline-flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Avg/day: <span className="font-semibold">{formatNum(totals.avg)}</span>
            {totals.peak?.RowKey && (
              <>
                <span className="opacity-50">•</span> Peak:{" "}
                <span className="font-semibold">{formatNum(totals.peak.total_tokens)}</span>{" "}
                on{" "}
                <span className="font-mono">
                  {`${totals.peak.RowKey.slice(0, 4)}-${totals.peak.RowKey.slice(4, 6)}-${totals.peak.RowKey.slice(6, 8)}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Trend</div>
          <Sparkline data={totals.dataForSpark || []} />
          <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Total tokens per day across selected range.
          </div>
        </div>
      </div>

      {/* Daily table */}
      <div className="mt-6 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Date</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-200">Prompt</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-200">Completion</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-200">Total</th>
              <th className="px-4 py-2 text-right text-sm font-medium text-gray-700 dark:text-gray-200">Quota</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Model</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-700">
            {(range?.daily ?? []).map((r: UsageDayRow) => {
              const iso = `${r.RowKey.slice(0, 4)}-${r.RowKey.slice(4, 6)}-${r.RowKey.slice(6, 8)}`;
              return (
                <tr key={r.RowKey} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100 font-mono">{iso}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100">{formatNum(r.prompt_tokens)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100">{formatNum(r.completion_tokens)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100 font-semibold">{formatNum(r.total_tokens)}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100">{formatNum(r.quota)}</td>
                  <td className="px-4 py-2 text-sm text-gray-800 dark:text-gray-100">{r.model || "—"}</td>
                </tr>
              );
            })}
            {!range?.daily?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No data for the selected range.
                </td>
              </tr>
            )}
          </tbody>
          {range?.daily?.length ? (
            <tfoot className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <td className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">Totals</td>
                <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100">
                  {formatNum(range.total_prompt_tokens)}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100">
                  {formatNum(range.total_completion_tokens)}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-800 dark:text-gray-100 font-semibold">
                  {formatNum(range.total_tokens)}
                </td>
                <td className="px-4 py-2" />
                <td className="px-4 py-2" />
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </div>
  );
}
