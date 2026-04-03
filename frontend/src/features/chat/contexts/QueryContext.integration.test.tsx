import React, { useContext, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

// Ensure msal/auth mocks are applied before importing the provider
const useMsalMock = vi.fn();
vi.mock('@azure/msal-react', () => ({
  useMsal: () => useMsalMock(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

// Mock AI API
const submitAiChatMock = vi.fn();
vi.mock('@/features/chat/api/ai', () => ({
  submitAiChat: (...args: any[]) => submitAiChatMock(...args),
}));

import { QueryProvider, QueryContext } from './QueryContext';

function TestConsumer() {
  const qc = useContext(QueryContext)!;

  useEffect(() => {
    void qc.runQuery('ai: why did sched fail');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div data-testid="last">{qc.queries.length ? qc.queries[qc.queries.length - 1].answer : ''}</div>;
}

function PendingStateConsumer() {
  const qc = useContext(QueryContext)!;

  useEffect(() => {
    void qc.runQuery('ai: why did sched fail');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div data-testid="pending-query">{qc.queries.length ? qc.queries[0].query : ''}</div>;
}

beforeEach(() => {
  submitAiChatMock.mockReset();
  try { localStorage.clear(); } catch { /* ignore */ }
});

test('QueryContext AI integration routes ai: queries to submitAiChat and stores the answer', async () => {
  const instance = { acquireTokenSilent: vi.fn() };
  useMsalMock.mockReturnValue({ instance });

  submitAiChatMock.mockResolvedValue({ answer: 'It failed due to timeout', remediation: [], references: [], session_id: 'sess-1' });

  render(
    <QueryProvider>
      <TestConsumer />
    </QueryProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('last').textContent).toBe('It failed due to timeout');
  });
});

test('QueryContext stores the user prompt before the AI answer resolves', async () => {
  const instance = { acquireTokenSilent: vi.fn() };
  useMsalMock.mockReturnValue({ instance });

  let resolveChat!: (value: { answer: string; remediation: []; references: []; session_id: string }) => void;
  submitAiChatMock.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveChat = resolve;
      }),
  );

  render(
    <QueryProvider>
      <PendingStateConsumer />
    </QueryProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('pending-query').textContent).toBe('ai: why did sched fail');
  });

  resolveChat({ answer: 'It failed due to timeout', remediation: [], references: [], session_id: 'sess-1' });
});

test('QueryContext stores returned session_id in localStorage', async () => {
  const instance = { acquireTokenSilent: vi.fn() };
  useMsalMock.mockReturnValue({ instance });

  submitAiChatMock.mockResolvedValue({ answer: 'Some answer', remediation: [], references: [], session_id: 'sess-stored' });

  render(
    <QueryProvider>
      <TestConsumer />
    </QueryProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('last').textContent).toBe('Some answer');
  });

  expect(localStorage.getItem('ai_chat_session_id')).toBe('sess-stored');
});
