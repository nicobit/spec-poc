import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock MSAL instance (not used in our test)
const mockMsalInstance: any = {};

// Mock the api module used by the dashboard
vi.mock('../api', () => ({
  listEnvironments: vi.fn(async () => ({ environments: [], total: 0, page: 0, per_page: 0 })),
  getEnvironment: vi.fn(async (msal: any, id: string) => ({ id, name: `env-${id}`, stages: [] })),
  listSchedules: vi.fn(async () => [
    {
      id: 'sched-1',
      environment: 'Test Environment',
      stage: 'dev-sql',
      action: 'stop',
      enabled: true,
      postponed_until: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour in future
      postponed_by: 'ops@example.com',
      postpone_reason: 'Maintenance window',
    },
  ]),
}));

// Mock auth hook to allow management actions
vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => ({ ready: true, isAdmin: true, roles: ['admin'] }),
}));

import EnvironmentDashboard from './EnvironmentDashboard';

describe('EnvironmentDashboard - postponed schedules', () => {
  it('renders postponed schedules subsection with entries', async () => {
    render(
      <MemoryRouter>
        <EnvironmentDashboard instance={mockMsalInstance} />
      </MemoryRouter>,
    );

    // Wait for async effect to finish
    await waitFor(() => expect(screen.getByText('Environments dashboard')).toBeTruthy());

    // Check for subsection header
    expect(screen.getByText('Postponed schedules')).toBeTruthy();

    // Check rendered postponed entry content
    expect(screen.getByText('Test Environment')).toBeTruthy();
    expect(screen.getByText(/dev-sql · stop/)).toBeTruthy();
    expect(screen.getByText(/by ops@example.com/)).toBeTruthy();
    expect(screen.getByText(/Reason: Maintenance window/)).toBeTruthy();
  });
});
