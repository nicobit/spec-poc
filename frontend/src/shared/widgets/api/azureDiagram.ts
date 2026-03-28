import { IPublicClientApplication } from "@azure/msal-browser";
import { Node, Edge } from "reactflow";
import { apiUrl, authFetch, getJson, withQuery } from "@/shared/api/client";

interface DiagramData {
  nodes: Node[];
  edges: Edge[];
}

export async function getAzureDiagram(instance: IPublicClientApplication): Promise<DiagramData> {
  return getAzureDiagramWithSubscription(instance, "2cc2bc74-f418-497c-8aec-3e23b0e08d87");
}

export async function getAzureDiagramWithSubscription(
  instance: IPublicClientApplication,
  subscriptionId: string
): Promise<DiagramData> {
  const response = await authFetch(
    instance,
    withQuery(apiUrl("/diagrams/data"), { subscriptionId }),
    { method: "GET" }
  );
  return getJson<DiagramData>(response);
}
