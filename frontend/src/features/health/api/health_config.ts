import { IPublicClientApplication } from "@azure/msal-browser";
import { apiUrl, authFetch, ensureOk, getJson } from "@/shared/api/client";

export type FieldSource =
  | { source: "inline"; value: unknown }
  | { source: "settings"; setting_name: string }
  | {
      source: "kv";
      key_vault: { vault_uri: string; secret_name: string };
    }
  | { source: string; [k: string]: any };

export interface ServiceConfig {
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface ServicesConfig {
  default_timeout_seconds?: number | null;
  services: ServiceConfig[];
}

export interface StoredConfig {
  etag?: string | null;
  config: ServicesConfig;
}

export async function getConfigSchema(instance: IPublicClientApplication) {
  const res = await authFetch(instance, apiUrl("/health/config/schema"), { method: "GET" });
  return getJson(res);
}

export async function validateConfig(instance: IPublicClientApplication, cfg: unknown) {
  const res = await authFetch(instance, apiUrl("/health/config/validate"), {
    method: "POST",
    body: JSON.stringify(cfg),
  });
  return getJson<{ ok: boolean; errors: Array<{ loc: string[]; msg: string }> }>(res);
}

const BASE = apiUrl("/health/config");

export class HealthConfigApi {
  private etag: string | null = null;

  constructor(private instance: IPublicClientApplication) {}

  async getConfig(signal?: AbortSignal): Promise<StoredConfig> {
    const res = await authFetch(this.instance, `${BASE}`, { method: "GET", signal });
    await ensureOk(res);
    const data = (await res.json()) as StoredConfig;
    this.etag = data.etag ?? null;
    return data;
  }

  async putConfig(cfg: ServicesConfig, signal?: AbortSignal): Promise<StoredConfig> {
    const headers: Record<string, string> = {};
    if (this.etag) headers["If-Match"] = this.etag;

    const res = await authFetch(this.instance, `${BASE}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(cfg),
      signal,
    });
    await ensureOk(res);
    const data = (await res.json()) as StoredConfig;
    this.etag = data.etag ?? null;
    return data;
  }

  async listServices(signal?: AbortSignal): Promise<ServiceConfig[]> {
    const res = await authFetch(this.instance, `${BASE}/services`, { method: "GET", signal });
    await ensureOk(res);
    return (await res.json()) as ServiceConfig[];
  }

  async getService(name: string, signal?: AbortSignal): Promise<ServiceConfig> {
    const res = await authFetch(this.instance, `${BASE}/services/${encodeURIComponent(name)}`, {
      method: "GET",
      signal,
    });
    await ensureOk(res);
    return (await res.json()) as ServiceConfig;
  }

  async addService(svc: ServiceConfig, signal?: AbortSignal): Promise<ServiceConfig> {
    const headers: Record<string, string> = {};
    if (this.etag) headers["If-Match"] = this.etag;

    const res = await authFetch(this.instance, `${BASE}/services`, {
      method: "POST",
      headers,
      body: JSON.stringify(svc),
      signal,
    });
    await ensureOk(res);
    const created = (await res.json()) as ServiceConfig;
    await this.getConfig(signal);
    return created;
  }

  async updateService(name: string, svc: ServiceConfig, signal?: AbortSignal): Promise<ServiceConfig> {
    const headers: Record<string, string> = {};
    if (this.etag) headers["If-Match"] = this.etag;

    const res = await authFetch(this.instance, `${BASE}/services/${encodeURIComponent(name)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(svc),
      signal,
    });
    await ensureOk(res);
    const updated = (await res.json()) as ServiceConfig;
    await this.getConfig(signal);
    return updated;
  }

  async deleteService(name: string, signal?: AbortSignal): Promise<void> {
    const headers: Record<string, string> = {};
    if (this.etag) headers["If-Match"] = this.etag;

    const res = await authFetch(this.instance, `${BASE}/services/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers,
      signal,
    });
    await ensureOk(res);
    await this.getConfig(signal);
  }

  get currentEtag() {
    return this.etag;
  }
}
