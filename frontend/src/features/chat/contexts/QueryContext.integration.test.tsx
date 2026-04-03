import React, { useContext, useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

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

test('QueryContext AI integration routes ai: queries to submitAiChat and stores the answer', async () => {
  const instance = { acquireTokenSilent: vi.fn() };
  useMsalMock.mockReturnValue({ instance });

  submitAiChatMock.mockResolvedValue({ answer: 'It failed due to timeout', remediation: [], references: [] });

  render(
    <QueryProvider>
      <TestConsumer />
    </QueryProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('last').textContent).toBe('It failed due to timeout');
  });
});
