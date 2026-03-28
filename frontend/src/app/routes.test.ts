import { describe, expect, it } from 'vitest';

import { authenticatedRouteConfigs, publicRouteConfigs } from './routes';

describe('app route configuration', () => {
  it('keeps login as the only public page and redirects root to login when unauthenticated', () => {
    expect(publicRouteConfigs).toHaveLength(2);
    expect(publicRouteConfigs[0]).toMatchObject({ path: '/', redirectTo: '/login' });
    expect(publicRouteConfigs[1]).toMatchObject({ path: '/login' });
  });

  it('marks settings as admin-only and keeps user route lowercase', () => {
    const settingsRoute = authenticatedRouteConfigs.find((route) => route.path === '/settings');
    const userRoute = authenticatedRouteConfigs.find((route) => route.path === '/user');

    expect(settingsRoute?.adminOnly).toBe(true);
    expect(userRoute).toBeDefined();
  });

  it('includes the main feature routes', () => {
    expect(authenticatedRouteConfigs.map((route) => route.path)).toEqual(
      expect.arrayContaining(['/', '/chat', '/question', '/status', '/costs']),
    );
  });
});
