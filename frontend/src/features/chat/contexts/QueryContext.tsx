import { createContext, useState, useCallback, type ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';

import { submitQuery } from '@/features/chat/api/query';
import {
  submitAiChat,
  listSessions,
  getSession,
  renameSession as apiRenameSession,
  deleteSession as apiDeleteSession,
} from '@/features/chat/api/ai';
import type { ChatSessionSummary } from '@/features/chat/api/ai';
import { useAuth } from '@/contexts/AuthContext';
import type { QueryResponse } from '@/features/chat/api/query';

export interface Query {
  id?: string;
  query: string;
  result: any;
  answer: string;
  chartType: string;
  error: string | null;
  isPending?: boolean;
  sql_query?: string;
  execution_history?: [];
  mermaid?: string;
  isExpanded?: boolean;
  reasoning?: string;
  isReasoningExpanded?: boolean;
}

export function buildPendingQueryEntry(id: string, queryText: string): Query {
  return {
    id,
    query: queryText,
    result: null,
    answer: '',
    chartType: '',
    error: null,
    isPending: true,
    execution_history: [],
  };
}

export function buildQuerySuccessEntry(queryText: string, resultData: QueryResponse, id?: string): Query {
  return {
    id,
    sql_query: resultData.sql_query,
    query: queryText,
    result: resultData.results,
    answer: resultData.answer,
    chartType: resultData.chart_type,
    error: null,
    isPending: false,
    execution_history: resultData.execution_history,
    reasoning: resultData.reasoning,
    mermaid: resultData.mermaid,
  };
}

export function buildQueryErrorEntry(queryText: string, caughtError: unknown, id?: string): Query {
  const message =
    caughtError instanceof Error ? caughtError.message : typeof caughtError === 'string' ? caughtError : 'Error';

  return {
    id,
    query: queryText,
    result: null,
    answer: '',
    chartType: '',
    error: message,
    isPending: false,
  };
}

interface QueryContextType {
  queries: Query[];
  runQuery: (queryText: string) => Promise<void>;
  selectedIndex: number | null;
  selectQuery: (index: number) => void;
  setQueries: (queries: Query[]) => void;
  resetSession: (name?: string) => void;
  sessions: ChatSessionSummary[];
  activeSessionId: string | undefined;
  loadSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
}

export const QueryContext = createContext<QueryContextType | null>(null);

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    try {
      return localStorage.getItem('ai_chat_session_id') ?? undefined;
    } catch {
      return undefined;
    }
  });
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  // name for the next new session (set by the new-chat flow)
  const [pendingSessionName, setPendingSessionName] = useState<string | undefined>(undefined);

  const { isAuthenticated } = useAuth();
  const { instance } = useMsal();

  const replaceQueryEntry = (queryId: string, nextEntry: Query) => {
    setQueries((previous) => previous.map((entry) => (entry.id === queryId ? nextEntry : entry)));
  };

  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const list = await listSessions(instance);
      setSessions(list);
    } catch {
      // non-fatal — sidebar degrades gracefully
    }
  }, [instance, isAuthenticated]);

  const loadSession = useCallback(async (targetSessionId: string) => {
    try {
      const detail = await getSession(instance, targetSessionId);
      // Convert backend turns into Query-shaped entries
      const users = detail.turns.filter((t) => t.role === 'user');
      const assistants = detail.turns.filter((t) => t.role === 'assistant');

      const normalizeAssistantContent = (raw: any) => {
        if (raw == null) return '';
        if (typeof raw !== 'string') return String(raw);
        // Try to recover from legacy/raw LLM payloads that may contain JSON
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && 'answer' in parsed) {
            return String(parsed.answer || '');
          }
          if (typeof parsed === 'string') return parsed;
        } catch {
          // not JSON — fall through
        }
        return raw;
      };

      const loaded: Query[] = users.map((t, i) => {
        const assistant = assistants[i];
        return {
          query: t.content,
          result: null,
          answer: normalizeAssistantContent(assistant?.content ?? ''),
          chartType: '',
          error: null,
          isPending: false,
        };
      });
      setQueries(loaded);
      setSelectedIndex(loaded.length > 0 ? loaded.length - 1 : null);
      setSessionId(targetSessionId);
      try {
        localStorage.setItem('ai_chat_session_id', targetSessionId);
      } catch {
        // ignore
      }
    } catch {
      // leave current state intact if load fails
    }
  }, [instance]);

  const renameSession = useCallback(async (targetSessionId: string, name: string) => {
    try {
      const updated = await apiRenameSession(instance, targetSessionId, name);
      setSessions((prev) => prev.map((s) => (s.id === targetSessionId ? { ...s, name: updated.name } : s)));
    } catch {
      // non-fatal
    }
  }, [instance]);

  const deleteSession = useCallback(async (targetSessionId: string) => {
    try {
      await apiDeleteSession(instance, targetSessionId);
      setSessions((prev) => prev.filter((s) => s.id !== targetSessionId));
      if (sessionId === targetSessionId) {
        setSessionId(undefined);
        setQueries([]);
        setSelectedIndex(null);
        try {
          localStorage.removeItem('ai_chat_session_id');
        } catch {
          // ignore
        }
      }
    } catch {
      // non-fatal
    }
  }, [instance, sessionId]);

  const runQuery = async (queryText: string) => {
    if (!isAuthenticated) {
      console.warn('User not authenticated');
      return;
    }

    const queryId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQueries((previous) => {
      setSelectedIndex(previous.length);
      return [...previous, buildPendingQueryEntry(queryId, queryText)];
    });

    try {
      // If user explicitly prefixes with `ai:` use AI chat endpoint
      if (queryText.trim().toLowerCase().startsWith('ai:')) {
        const message = queryText.trim().slice(3).trim();
        // include environment filter from URL if present
        const params = new URLSearchParams(window.location.search);
        const environmentId = params.get('environmentId');
        const environmentName = params.get('environmentName');
        const filters: Record<string, any> = {};
        if (environmentId) filters.environmentId = environmentId;
        else if (environmentName) filters.environmentName = environmentName;

        // pass pendingSessionName on first message (new session)
        const nameToSend = sessionId ? undefined : pendingSessionName;
        if (nameToSend !== undefined) setPendingSessionName(undefined);

        const aiResp = await submitAiChat(instance, message, filters, sessionId, nameToSend);
        // Persist the session id returned by the server
        if (aiResp.session_id) {
          const isNew = aiResp.session_id !== sessionId;
          setSessionId(aiResp.session_id);
          try {
            localStorage.setItem('ai_chat_session_id', aiResp.session_id);
          } catch {
            // localStorage may be unavailable in some environments
          }
          if (isNew) {
            // refresh sidebar to include the newly created session
            loadSessions();
          }
        }
        // Map AI response into Query shape
        const entry = {
          id: queryId,
          query: queryText,
          result: null,
          answer: aiResp.answer || '',
          chartType: '',
          error: null,
          isPending: false,
          sql_query: undefined,
          execution_history: [],
          mermaid: aiResp.mermaid,
          reasoning: aiResp.references ? JSON.stringify(aiResp.references, null, 2) : '',
        } as Query;
        replaceQueryEntry(queryId, entry);
        return;
      }

      const resultData = await submitQuery(instance, queryText);
      replaceQueryEntry(queryId, buildQuerySuccessEntry(queryText, resultData, queryId));
    } catch (caughtError: unknown) {
      replaceQueryEntry(queryId, buildQueryErrorEntry(queryText, caughtError, queryId));
    }
  };

  const selectQuery = (index: number) => {
    if (index >= 0 && index < queries.length) {
      setSelectedIndex(index);
    }
  };

  const resetSession = (name?: string) => {
    setSessionId(undefined);
    setQueries([]);
    setSelectedIndex(null);
    setPendingSessionName(name || undefined);
    try {
      localStorage.removeItem('ai_chat_session_id');
    } catch {
      // ignore
    }
  };

  return (
    <QueryContext.Provider
      value={{
        queries,
        runQuery,
        selectedIndex,
        selectQuery,
        setQueries,
        resetSession,
        sessions,
        activeSessionId: sessionId,
        loadSessions,
        loadSession,
        renameSession,
        deleteSession,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
}
