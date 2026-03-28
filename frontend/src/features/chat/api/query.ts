import { IPublicClientApplication } from "@azure/msal-browser";
import { apiUrl, authFetch, getJson } from "@/shared/api/client";

export interface QueryResponse {
  sql_query?: string;
  results: unknown;
  answer: string;
  chart_type: string;
  execution_history?: [];
  reasoning?: string;
  mermaid?: string;
}

export async function submitQuery(
  instance: IPublicClientApplication,
  queryText: string
): Promise<QueryResponse> {
  const response = await authFetch(instance, apiUrl("/texttosql/query"), {
    method: "POST",
    body: JSON.stringify({ query: queryText, session_id: "" }),
  });
  return getJson<QueryResponse>(response);
}
