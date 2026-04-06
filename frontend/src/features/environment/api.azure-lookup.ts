import { IPublicClientApplication } from "@azure/msal-browser";
import { authFetch, getJson, apiUrl } from "@/shared/api/client";

// ---------------------------------------------------------------------------
// Types returned by the backend lookup endpoints
// ---------------------------------------------------------------------------

export type AzureSubscription = {
  subscriptionId: string;
  displayName: string;
  state: string | null;
};

export type AzureResourceGroup = {
  name: string;
  location: string;
};

export type AzureNamedResource = {
  name: string;
  location: string;
  id: string;
};

export type AzureSqlPool = {
  name: string;
  location: string;
  status: string | null;
  id: string;
};

export type AzureServiceBusNamespace = {
  name: string;
  shortName: string;
  location: string;
  id: string;
};

export type AzureServiceBusEntity = {
  name: string;
  entityType: "queue" | "topic";
};

export type AzureWebApp = {
  name: string;
  location?: string;
  id?: string;
};

export type AzureContainerGroup = {
  name: string;
  location?: string;
  id?: string;
};

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export async function listAzureSubscriptions(
  msalInstance: IPublicClientApplication,
): Promise<AzureSubscription[]> {
  const res = await authFetch(msalInstance, apiUrl("/azure/subscriptions"), { method: "GET" });
  const body = await getJson<{ subscriptions: AzureSubscription[] }>(res);
  return body.subscriptions ?? [];
}

export async function listAzureResourceGroups(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
): Promise<AzureResourceGroup[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(`/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups`),
    { method: "GET" },
  );
  const body = await getJson<{ resourceGroups: AzureResourceGroup[] }>(res);
  return body.resourceGroups ?? [];
}

export async function listAzureSqlVms(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureNamedResource[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/sql-vms`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ sqlVms: AzureNamedResource[] }>(res);
  return body.sqlVms ?? [];
}

export async function listAzureSqlManagedInstances(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureNamedResource[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/sql-managed-instances`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ sqlManagedInstances: AzureNamedResource[] }>(res);
  return body.sqlManagedInstances ?? [];
}

export async function listAzureSynapseWorkspaces(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureNamedResource[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/synapse-workspaces`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ synapseWorkspaces: AzureNamedResource[] }>(res);
  return body.synapseWorkspaces ?? [];
}

export async function listAzureSynapseSqlPools(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
  workspaceName: string,
): Promise<AzureSqlPool[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/synapse-workspaces/${encodeURIComponent(workspaceName)}/sql-pools`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ sqlPools: AzureSqlPool[] }>(res);
  return body.sqlPools ?? [];
}

export async function listAzureServiceBusNamespaces(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureServiceBusNamespace[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/service-bus-namespaces`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ serviceBusNamespaces: AzureServiceBusNamespace[] }>(res);
  return body.serviceBusNamespaces ?? [];
}

export async function listAzureServiceBusEntities(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
  namespaceName: string,
): Promise<AzureServiceBusEntity[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/service-bus-namespaces/${encodeURIComponent(namespaceName)}/entities`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ entities: AzureServiceBusEntity[] }>(res);
  return body.entities ?? [];
}

export async function listAzureWebApps(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureWebApp[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/web-apps`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ webApps: AzureWebApp[] }>(res);
  return body.webApps ?? [];
}

export async function listAzureContainerGroups(
  msalInstance: IPublicClientApplication,
  subscriptionId: string,
  resourceGroup: string,
): Promise<AzureContainerGroup[]> {
  const res = await authFetch(
    msalInstance,
    apiUrl(
      `/azure/subscriptions/${encodeURIComponent(subscriptionId)}/resource-groups/${encodeURIComponent(resourceGroup)}/container-groups`,
    ),
    { method: "GET" },
  );
  const body = await getJson<{ containerGroups: AzureContainerGroup[] }>(res);
  return body.containerGroups ?? [];
}
