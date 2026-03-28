import { IPublicClientApplication } from "@azure/msal-browser";

import { apiUrl, authFetch, getJson, withQuery } from "@/shared/api/client";

export type CacheKind = "redis" | "memory";

export interface CostsHealth {
  ok: boolean;
  cache: CacheKind;
  ttl: number;
}

export interface IncreaseItem {
  service_name: string;
  current_cost: number;
  previous_cost: number;
  abs_change: number;
  pct_change: number | null;
  share_of_increase_pct: number;
}

export interface IncreaseResponse {
  scope: string;
  currency: string;
  granularity: "Monthly" | "Weekly (ISO)";
  period_current: string;
  period_previous: string;
  items: IncreaseItem[];
}

export interface TopDriversResponse {
  scope: string;
  currency: string;
  granularity: "Monthly" | "Weekly (ISO)";
  period_current: string;
  period_previous: string;
  total_increase: number;
  drivers: IncreaseItem[];
}

export async function getCostsHealth(
  instance: IPublicClientApplication,
  signal?: AbortSignal,
): Promise<CostsHealth> {
  const response = await authFetch(instance, apiUrl("/costs/health"), { method: "GET", signal });
  return getJson<CostsHealth>(response);
}

export async function clearCostsCache(
  instance: IPublicClientApplication,
  signal?: AbortSignal,
): Promise<{ cleared: boolean }> {
  const response = await authFetch(instance, apiUrl("/costs/admin/cache/clear"), {
    method: "GET",
    signal,
  });
  return getJson<{ cleared: boolean }>(response);
}

export interface IncreaseByMonthParams {
  scope?: string;
  referenceDate?: string;
  noCache?: 0 | 1;
}

export async function getIncreaseByMonth(
  instance: IPublicClientApplication,
  params: IncreaseByMonthParams = {},
  signal?: AbortSignal,
): Promise<IncreaseResponse> {
  const url = withQuery(apiUrl("/costs/increase/month"), {
    scope: params.scope,
    reference_date: params.referenceDate,
    no_cache: params.noCache ?? 0,
  });
  const response = await authFetch(instance, url, { method: "GET", signal });
  return getJson<IncreaseResponse>(response);
}

export interface IncreaseByWeekParams {
  scope?: string;
  weeksWindow?: number;
  referenceEnd?: string;
  noCache?: 0 | 1;
}

export async function getIncreaseByWeek(
  instance: IPublicClientApplication,
  params: IncreaseByWeekParams = {},
  signal?: AbortSignal,
): Promise<IncreaseResponse> {
  const url = withQuery(apiUrl("/costs/increase/week"), {
    scope: params.scope,
    weeks_window: params.weeksWindow ?? 1,
    reference_end: params.referenceEnd,
    no_cache: params.noCache ?? 0,
  });
  const response = await authFetch(instance, url, { method: "GET", signal });
  return getJson<IncreaseResponse>(response);
}

export type TopDriversMode = "month" | "week";

export interface TopDriversParams {
  scope?: string;
  mode?: TopDriversMode;
  weeksWindow?: number;
  referenceDate?: string;
  referenceEnd?: string;
  topN?: number;
  noCache?: 0 | 1;
}

export async function getTopDrivers(
  instance: IPublicClientApplication,
  params: TopDriversParams = {},
  signal?: AbortSignal,
): Promise<TopDriversResponse> {
  const url = withQuery(apiUrl("/costs/top-drivers"), {
    scope: params.scope,
    mode: params.mode ?? "month",
    weeks_window: params.weeksWindow,
    reference_date: params.referenceDate,
    reference_end: params.referenceEnd,
    top_n: params.topN ?? 5,
    no_cache: params.noCache ?? 0,
  });
  const response = await authFetch(instance, url, { method: "GET", signal });
  return getJson<TopDriversResponse>(response);
}
