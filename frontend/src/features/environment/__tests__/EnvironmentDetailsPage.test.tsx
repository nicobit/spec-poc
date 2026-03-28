import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMsalInstance = {} as never;

const { mockGetEnvironment } = vi.hoisted(() => ({
  mockGetEnvironment: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => ({ ready: true, isAdmin: true, roles: ['EnvironmentAdmin'] }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return {
    ...actual,
    getEnvironment: (...args: unknown[]) => mockGetEnvironment(...args),
    startEnvironment: vi.fn(),
    stopEnvironment: vi.fn(),
    startStage: vi.fn(),
    stopStage: vi.fn(),
  };
});

import EnvironmentDetailsPage from '../pages/EnvironmentDetailsPage';

describe('EnvironmentDetailsPage', () => {
  beforeEach(() => {
    mockGetEnvironment.mockReset();
  });

  it('renders the redesigned details overview and stage sections', async () => {
    mockGetEnvironment.mockResolvedValue({
      id: 'env-1',
      name: 'CLIENT01 - DEV',
      status: 'stopped',
      client: 'CLIENT 1',
      region: 'eastus',
      lifecycle: 'DEV',
      stages: [
        {
          id: 'stage-1',
          name: 'STG',
          status: 'stopped',
          resourceActions: [
            { type: 'sql-vm', subscriptionId: 'sub-1', resourceGroup: 'rg-1', serverName: 'sqlvm-01' },
          ],
          notificationGroups: [],
          azureConfig: { workspace: 'ops' },
        },
      ],
      schedules: [],
      activity: {
        entries: [{ RowKey: '1', action: 'update', status: 'success', timestamp: '2026-03-26T21:49:43.820448Z' }],
      },
    });

    render(
      <MemoryRouter initialEntries={['/environment/env-1']}>
        <Routes>
          <Route path="/environment/:id" element={<EnvironmentDetailsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('CLIENT01 - DEV')).toBeTruthy();
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(screen.getByText('Derived types')).toBeTruthy();
    expect(screen.getAllByText('Stages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Resource actions').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Stage configuration').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Schedules').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recent activity').length).toBeGreaterThan(0);
    expect(screen.queryByText('Azure config')).toBeNull();
  });
});
