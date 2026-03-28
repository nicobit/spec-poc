import { IPublicClientApplication } from "@azure/msal-browser";

import { normalizeTabs, TabConfig } from "@/types";
import { apiUrl, authFetch, getJson } from "@/shared/api/client";

const API = apiUrl("/dashboard/data");

export async function loadDashboard(instance: IPublicClientApplication): Promise<TabConfig[]> {
  const response = await authFetch(instance, API, { method: "GET" });
  return normalizeTabs(await getJson<TabConfig[]>(response));
}

export const saveDashboard = async (
  instance: IPublicClientApplication,
  tabs: TabConfig[],
) => {
  const response = await authFetch(instance, API, {
    method: "PUT",
    body: JSON.stringify({ tabs }),
  });
  await getJson<unknown>(response);
};
