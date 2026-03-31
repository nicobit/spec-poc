import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route } from 'react-router-dom';

import { QueryContext } from '@/features/chat/contexts/QueryContext';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: { logoutPopup: vi.fn() } }),
}));

vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => ({ isAdmin: true }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'commerce', darkMode: false, toggleMode: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User' }, isAuthenticated: true }),
}));

vi.mock('@/contexts/SidebarContext', () => ({
  useSidebar: () => ({ sidebarOpen: true, toggleSidebar: vi.fn() }),
}));

vi.mock('@/app/components/Sidebar', () => ({
  default: () => <div>Sidebar</div>,
}));

vi.mock('@/app/navigation/sidebar-menu', () => ({
  getMenuItems: () => [],
}));

vi.mock('@/app/routes', async () => {
  const React = await import('react');
  return {
    renderAuthenticatedRoutes: () => React.createElement(Route, { path: '*', element: React.createElement('div', null, 'Route body') }),
  };
});

import AppShell from './AppShell';

describe('AppShell assistant panel', () => {
  it('toggles the right-side assistant panel from the topbar', async () => {
    const user = userEvent.setup();

    render(
      <QueryContext.Provider
        value={{
          queries: [],
          runQuery: vi.fn(),
          selectedIndex: null,
          selectQuery: vi.fn(),
          setQueries: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={['/clients']}>
          <AppShell />
        </MemoryRouter>
      </QueryContext.Provider>,
    );

    expect(screen.queryByTestId('assistant-panel')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Open AI assistant' }));
    const panel = screen.getByTestId('assistant-panel');
    expect(panel).toBeTruthy();
    expect(panel.getAttribute('data-expanded')).toBe('false');

    await user.click(within(panel).getByRole('button', { name: 'Expand AI assistant' }));
    expect(screen.getByTestId('assistant-panel').getAttribute('data-expanded')).toBe('true');
    expect(screen.getByText('Route body')).toBeTruthy();

    await user.click(within(screen.getByTestId('assistant-panel')).getByRole('button', { name: 'Restore AI assistant width' }));
    expect(screen.getByTestId('assistant-panel').getAttribute('data-expanded')).toBe('false');

    await user.click(within(screen.getByTestId('assistant-panel')).getByRole('button', { name: 'Expand AI assistant' }));
    await user.click(within(screen.getByTestId('assistant-panel')).getByRole('button', { name: 'Close AI assistant' }));
    expect(screen.queryByTestId('assistant-panel')).toBeNull();
    expect(screen.getByText('Route body')).toBeTruthy();
  });
});
