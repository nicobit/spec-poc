import { IPublicClientApplication } from "@azure/msal-browser";
import { apiUrl, authFetch, getJson } from '@/shared/api/client';

export interface AiChatResponse {
  answer: string;
  remediation?: string[];
  references?: Array<{ type: string; id?: string; snippet?: string }>;
}

export async function submitAiChat(
  instance: IPublicClientApplication,
  message: string,
  filters?: Record<string, any>
): Promise<AiChatResponse> {
  const body = { message, filters: filters || {}, includeRemediation: true };
  const res = await authFetch(instance, apiUrl('/ai/chat'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return getJson<AiChatResponse>(res);
}
