import { IPublicClientApplication } from "@azure/msal-browser";
import { loginRequest } from "@/authConfig";
import { env } from "@/config/env";

export class ApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(body || `Request failed: ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function authFetch(
  instance: IPublicClientApplication,
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let accessToken: string | undefined;
  try {
    const silent = await instance.acquireTokenSilent(loginRequest);
    accessToken = (silent as any)?.accessToken;
  } catch (err) {
    // Silent token acquisition can fail with interaction_required (user needs to sign-in).
    // Try an interactive popup first, otherwise fall back to redirect.
    try {
      const popup = await instance.acquireTokenPopup(loginRequest);
      accessToken = (popup as any)?.accessToken;
    } catch (popupErr) {
      // If popup fails or is blocked, trigger a redirect to prompt the user to sign-in.
      try {
        await instance.loginRedirect(loginRequest);
        // loginRedirect will navigate away; this line should not be reached normally.
      } catch (redirectErr) {
        throw redirectErr;
      }
    }
  }
  const headers = new Headers(init?.headers || {});
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  return fetch(input, {
    credentials: "include",
    ...init,
    headers,
  });
}

export async function ensureOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ApiError(res.status, body);
  }
  return res;
}

export async function getJson<T>(res: Response): Promise<T> {
  await ensureOk(res);
  return res.json() as Promise<T>;
}

export function apiUrl(path: string): string {
  const baseUrl = env.apiBaseUrl.endsWith("/")
    ? env.apiBaseUrl.slice(0, -1)
    : env.apiBaseUrl;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${baseUrl}${normalizedPath}`;
}

export function withQuery(
  url: string,
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${url}?${query}` : url;
}
