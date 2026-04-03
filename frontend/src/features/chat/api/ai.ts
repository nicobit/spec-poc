import { IPublicClientApplication } from "@azure/msal-browser";
import { apiUrl, authFetch, getJson } from '@/shared/api/client';

export interface AiChatResponse {
  answer: string;
  remediation?: string[];
  references?: Array<{ type: string; id?: string; snippet?: string }>;
  session_id: string;
  history?: Array<{ role: string; content: string }>;
}

export interface ChatSessionSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  turnCount: number;
}

export interface ChatSessionDetail extends ChatSessionSummary {
  turns: Array<{ role: string; content: string }>;
}

export async function submitAiChat(
  instance: IPublicClientApplication,
  message: string,
  filters?: Record<string, any>,
  sessionId?: string,
  name?: string
): Promise<AiChatResponse> {
  const body: Record<string, any> = { message, filters: filters || {}, includeRemediation: true };
  if (sessionId) {
    body.session_id = sessionId;
  }
  if (name && !sessionId) {
    body.name = name;
  }
  const res = await authFetch(instance, apiUrl('/ai/chat'), {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return getJson<AiChatResponse>(res);
}

export async function listSessions(instance: IPublicClientApplication): Promise<ChatSessionSummary[]> {
  const res = await authFetch(instance, apiUrl('/ai/sessions'));
  const data = await getJson<{ sessions: ChatSessionSummary[] }>(res);
  return data.sessions;
}

export async function getSession(
  instance: IPublicClientApplication,
  sessionId: string
): Promise<ChatSessionDetail> {
  const res = await authFetch(instance, apiUrl(`/ai/sessions/${sessionId}`));
  return getJson<ChatSessionDetail>(res);
}

export async function renameSession(
  instance: IPublicClientApplication,
  sessionId: string,
  name: string
): Promise<ChatSessionSummary> {
  const res = await authFetch(instance, apiUrl(`/ai/sessions/${sessionId}`), {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
  return getJson<ChatSessionSummary>(res);
}

export async function deleteSession(
  instance: IPublicClientApplication,
  sessionId: string
): Promise<void> {
  await authFetch(instance, apiUrl(`/ai/sessions/${sessionId}`), { method: 'DELETE' });
}
