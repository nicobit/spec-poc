import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const useAuthMock = vi.fn();
const renderPublicRoutesMock = vi.fn(() => 'PUBLIC_ROUTES');

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('@/app/routes', () => ({
  renderPublicRoutes: () => renderPublicRoutesMock(),
}));

vi.mock('@/app/AppShell', () => ({
  default: () => <div>APP_SHELL</div>,
}));

vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Routes: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import App from './App';

describe('App auth routing', () => {
  it('shows authentication loading until auth is ready', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isReady: false });

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('Loading authentication...');
  });

  it('renders public routes when unauthenticated', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, isReady: true });

    const html = renderToStaticMarkup(<App />);

    expect(renderPublicRoutesMock).toHaveBeenCalled();
    expect(html).toContain('PUBLIC_ROUTES');
  });

  it('renders the authenticated app shell when signed in', () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true, isReady: true });

    const html = renderToStaticMarkup(<App />);

    expect(html).toContain('APP_SHELL');
  });
});
