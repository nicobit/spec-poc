import { apiUrl, authFetch, ensureOk, getJson, withQuery } from '@/shared/api/client';
import type { IPublicClientApplication } from '@azure/msal-browser';

export type AuditEntry = {
  id: string;
  actor?: string | null;
  action?: string | null;
  resource?: string | null;
  client?: string | null;
  details?: any;
  createdAt?: string | null;
};

export type AuditListResponse = {
  total: number;
  audits: AuditEntry[];
};

export async function listAudits(
  instance: IPublicClientApplication,
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<AuditListResponse> {
  const url = withQuery(apiUrl('/audit'), params);
  const res = await authFetch(instance, url, { method: 'GET' });
  await ensureOk(res);
  return res.json();
}

export async function getAudit(
  instance: IPublicClientApplication,
  id: string
): Promise<AuditEntry> {
  const res = await authFetch(instance, apiUrl(`/audit/${encodeURIComponent(id)}`), { method: 'GET' });
  return getJson<AuditEntry>(res);
}

export async function exportAudits(
  instance: IPublicClientApplication,
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<Response> {
  const url = withQuery(apiUrl('/audit/export'), params);
  const res = await authFetch(instance, url, { method: 'GET' });
  await ensureOk(res);
  return res;
}
