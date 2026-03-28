import { IPublicClientApplication } from "@azure/msal-browser";

import { apiUrl, authFetch, getJson, withQuery } from "@/shared/api/client";

export interface IExample {
  doc_id: string;
  question: string;
  sql: string;
  sql_embedding?: number[];
}

export async function getDatabases(msalInstance: IPublicClientApplication): Promise<string[]> {
  const response = await authFetch(msalInstance, apiUrl('/queryexamples/databases'), {
    method: 'GET',
  });
  const data = await getJson<{ databases: string[] }>(response);
  return data.databases;
}

export async function getExamples(
  msalInstance: IPublicClientApplication,
  database: string,
): Promise<IExample[]> {
  const response = await authFetch(
    msalInstance,
    withQuery(apiUrl('/queryexamples/examples'), { database }),
    { method: 'GET' },
  );
  const data = await getJson<{ examples: IExample[] }>(response);
  return data.examples;
}

export async function deleteExample(
  msalInstance: IPublicClientApplication,
  doc_id: string,
  database: string,
): Promise<any> {
  const response = await authFetch(
    msalInstance,
    withQuery(apiUrl('/queryexamples/delete_example'), { doc_id, database }),
    { method: 'DELETE' },
  );
  return getJson(response);
}

export async function updateExample(
  msalInstance: IPublicClientApplication,
  doc_id: string,
  question: string,
  sql: string,
  database: string,
): Promise<any> {
  const response = await authFetch(msalInstance, apiUrl('/queryexamples/update_example'), {
    method: 'PUT',
    body: JSON.stringify({
      doc_id,
      question,
      sql,
      database,
    }),
  });
  return getJson(response);
}

export async function addExample(
  msalInstance: IPublicClientApplication,
  question: string,
  sql: string,
  database: string = 'default',
): Promise<any> {
  const response = await authFetch(msalInstance, apiUrl('/queryexamples/add_example'), {
    method: 'POST',
    body: JSON.stringify({
      question,
      sql,
      database,
    }),
  });
  return getJson(response);
}
