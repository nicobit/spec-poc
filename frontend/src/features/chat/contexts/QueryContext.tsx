import { createContext, useState, type ReactNode } from 'react';
import { useMsal } from '@azure/msal-react';

import { submitQuery } from '@/features/chat/api/query';
import { useAuth } from '@/contexts/AuthContext';
import type { QueryResponse } from '@/features/chat/api/query';

export interface Query {
  query: string;
  result: any;
  answer: string;
  chartType: string;
  error: string | null;
  sql_query?: string;
  execution_history?: [];
  mermaid?: string;
  isExpanded?: boolean;
  reasoning?: string;
  isReasoningExpanded?: boolean;
}

export function buildQuerySuccessEntry(queryText: string, resultData: QueryResponse): Query {
  return {
    sql_query: resultData.sql_query,
    query: queryText,
    result: resultData.results,
    answer: resultData.answer,
    chartType: resultData.chart_type,
    error: null,
    execution_history: resultData.execution_history,
    reasoning: resultData.reasoning,
    mermaid: resultData.mermaid,
  };
}

export function buildQueryErrorEntry(queryText: string, caughtError: unknown): Query {
  const message =
    caughtError instanceof Error ? caughtError.message : typeof caughtError === 'string' ? caughtError : 'Error';

  return {
    query: queryText,
    result: null,
    answer: '',
    chartType: '',
    error: message,
  };
}

interface QueryContextType {
  queries: Query[];
  runQuery: (queryText: string) => Promise<void>;
  selectedIndex: number | null;
  selectQuery: (index: number) => void;
  setQueries: (queries: Query[]) => void;
}

export const QueryContext = createContext<QueryContextType | null>(null);

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queries, setQueries] = useState<Query[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const { isAuthenticated } = useAuth();
  const { instance } = useMsal();

  const runQuery = async (queryText: string) => {
    if (!isAuthenticated) {
      console.warn('User not authenticated');
      return;
    }

    try {
      const resultData = await submitQuery(instance, queryText);
      setQueries((previous) => {
        return [...previous, buildQuerySuccessEntry(queryText, resultData)];
      });
      setSelectedIndex(queries.length);
    } catch (caughtError: unknown) {
      setQueries((previous) => {
        return [...previous, buildQueryErrorEntry(queryText, caughtError)];
      });
      setSelectedIndex(queries.length);
    }
  };

  const selectQuery = (index: number) => {
    if (index >= 0 && index < queries.length) {
      setSelectedIndex(index);
    }
  };

  return (
    <QueryContext.Provider value={{ queries, runQuery, selectedIndex, selectQuery, setQueries }}>
      {children}
    </QueryContext.Provider>
  );
}
