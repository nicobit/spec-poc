import { IPublicClientApplication } from "@azure/msal-browser";

import { apiUrl, authFetch, ensureOk, getJson, withQuery } from "@/shared/api/client";

export type ClientAdminAssignment = {
  type: 'user';
  id: string;
  displayName?: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  shortCode: string;
  country: string;
  timezone: string;
  clientAdmins: ClientAdminAssignment[];
  retired: boolean;
  retiredAt?: string | null;
  retiredBy?: string | null;
};

export async function listClients(
  msalInstance: IPublicClientApplication,
  options?: { search?: string; retired?: boolean; page?: number; perPage?: number; sortBy?: string; sortDir?: 'asc' | 'desc' },
): Promise<{ clients: ClientRecord[]; total: number; page: number; per_page: number }> {
  const url = withQuery(apiUrl('/clients'), {
    search: options?.search,
    retired: options?.retired,
    page: options?.page ?? 0,
    per_page: options?.perPage ?? 20,
    sort_by: options?.sortBy ?? 'name',
    sort_dir: options?.sortDir ?? 'asc',
  });
  const res = await authFetch(msalInstance, url, { method: 'GET' });
  const body = await getJson<{ clients?: ClientRecord[]; total?: number; page?: number; per_page?: number }>(res);
  return {
    clients: body.clients || [],
    total: body.total || 0,
    page: body.page ?? 0,
    per_page: body.per_page ?? 20,
  };
}

export async function getClient(msalInstance: IPublicClientApplication, id: string): Promise<ClientRecord> {
  const res = await authFetch(msalInstance, apiUrl(`/clients/${encodeURIComponent(id)}`), { method: 'GET' });
  return getJson<ClientRecord>(res);
}

export async function createClient(
  msalInstance: IPublicClientApplication,
  payload: Omit<ClientRecord, 'id' | 'retired' | 'retiredAt' | 'retiredBy'>,
): Promise<ClientRecord> {
  const res = await authFetch(msalInstance, apiUrl('/clients'), { method: 'POST', body: JSON.stringify(payload) });
  const body = await getJson<{ created: ClientRecord }>(res);
  return body.created;
}

export async function updateClient(
  msalInstance: IPublicClientApplication,
  id: string,
  payload: Omit<ClientRecord, 'id' | 'retired' | 'retiredAt' | 'retiredBy'>,
): Promise<ClientRecord> {
  const res = await authFetch(msalInstance, apiUrl(`/clients/${encodeURIComponent(id)}`), { method: 'PUT', body: JSON.stringify(payload) });
  const body = await getJson<{ updated: ClientRecord }>(res);
  return body.updated;
}

export async function retireClient(
  msalInstance: IPublicClientApplication,
  id: string,
  payload?: { reason?: string },
): Promise<ClientRecord> {
  const res = await authFetch(msalInstance, apiUrl(`/clients/${encodeURIComponent(id)}/retire`), {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
  const body = await getJson<{ updated: ClientRecord }>(res);
  return body.updated;
}

export async function retireClients(
  msalInstance: IPublicClientApplication,
  ids: string[],
  payload?: { reason?: string },
): Promise<ClientRecord[]> {
  const res = await authFetch(msalInstance, apiUrl('/clients/retire'), {
    method: 'POST',
    body: JSON.stringify({ ids, ...(payload || {}) }),
  });
  const body = await getJson<{ updated?: ClientRecord[] }>(res);
  return body.updated || [];
}

export async function deleteClientNotSupported(
  msalInstance: IPublicClientApplication,
  id: string,
): Promise<void> {
  const res = await authFetch(msalInstance, apiUrl(`/clients/${encodeURIComponent(id)}`), { method: 'DELETE' });
  await ensureOk(res);
}
