import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { QueryContext, type Query } from '@/features/chat/contexts/QueryContext';

import AssistantPanel from './AssistantPanel';

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'commerce' }),
}));

function renderPanel(overrides?: Partial<React.ContextType<typeof QueryContext>>) {
  const runQuery = vi.fn().mockResolvedValue(undefined);
  const value = {
    queries: [] as Query[],
    runQuery,
    selectedIndex: null,
    selectQuery: vi.fn(),
    setQueries: vi.fn(),
    ...overrides,
  };

  render(
    <QueryContext.Provider value={value}>
      <AssistantPanel
        width={420}
        topOffset={80}
        expanded={false}
        onWidthChange={vi.fn()}
        onToggleExpand={vi.fn()}
        onClose={vi.fn()}
      />
    </QueryContext.Provider>,
  );

  return { runQuery, value };
}

describe('AssistantPanel', () => {
  it('shows the empty state and submits a prompt from the integrated composer', async () => {
    const user = userEvent.setup();
    const { runQuery } = renderPanel();

    expect(screen.getByText('Start a conversation')).toBeTruthy();

    await user.type(screen.getByPlaceholderText('Ask anything about the portal...'), 'How many environments are running?');
    await user.click(screen.getByRole('button', { name: 'Send assistant message' }));

    await waitFor(() => {
      expect(runQuery).toHaveBeenCalledWith('ai: How many environments are running?');
    });
  });

  it('renders existing conversation entries and propagates resize drag updates', () => {
    const onWidthChange = vi.fn();
    render(
      <QueryContext.Provider
        value={{
          queries: [
            {
              query: 'Summarize DEV',
              result: [],
              answer: 'DEV is currently stopped.',
              chartType: '',
              error: null,
            },
          ],
          runQuery: vi.fn(),
          selectedIndex: null,
          selectQuery: vi.fn(),
          setQueries: vi.fn(),
        }}
      >
        <AssistantPanel
          width={400}
          topOffset={80}
          expanded={false}
          onWidthChange={onWidthChange}
          onToggleExpand={vi.fn()}
          onClose={vi.fn()}
        />
      </QueryContext.Provider>,
    );

    expect(screen.getByText('Summarize DEV')).toBeTruthy();
    expect(screen.getByText('DEV is currently stopped.')).toBeTruthy();

    const resizeHandle = screen.getByRole('button', { name: 'Resize assistant panel' });
    fireEvent.mouseDown(resizeHandle, { clientX: 900 });
    fireEvent.mouseMove(window, { clientX: 840 });
    fireEvent.mouseUp(window);

    expect(onWidthChange).toHaveBeenCalledWith(460);
  });
});
