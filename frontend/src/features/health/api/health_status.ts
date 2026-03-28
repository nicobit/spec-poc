import { IPublicClientApplication } from "@azure/msal-browser";
import { apiUrl, authFetch, getJson } from "@/shared/api/client";

export type OverallStatus = "pass" | "fail" | "degraded";

export type CheckStatus = "pass" | "fail" | "skip";

export interface CheckResult {
  name: string;
  status: CheckStatus;
  latency_ms?: number | null;
  error?: string | null;
  details?: Record<string, any> | null;
}

export interface HealthResponse {
  status: OverallStatus;
  results: CheckResult[];
}

export async function getLiveness(
  instance: IPublicClientApplication,
  signal?: AbortSignal
): Promise<{ status: string }> {
  const res = await authFetch(instance, apiUrl("/health/healthz"), { method: "GET", signal });
  return getJson<{ status: string }>(res);
}

export async function getReadiness(
  instance: IPublicClientApplication,
  signal?: AbortSignal
): Promise<HealthResponse> {
  const res = await authFetch(instance, apiUrl("/health/readyz"), { method: "GET", signal });
  return getJson<HealthResponse>(res);
}
