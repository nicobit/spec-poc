import { fireEvent, render, screen } from '@testing-library/react';
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
      schedules: [
        {
          id: 'sched-1',
          action: 'start',
          stage: 'stage1',
          stage_id: 'stage-1',
          cron: '0 8 * * 1-5',
          timezone: 'UTC',
          enabled: true,
        },
      ],
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
    expect(screen.getByText('CLIENT 1')).toBeTruthy();
    expect(await screen.findByText('Overview')).toBeTruthy();
    expect(screen.getByText('Derived types')).toBeTruthy();
    expect(screen.getAllByText('Stages').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Azure services').length).toBeGreaterThan(0);
    expect(screen.queryByText('Additional settings')).toBeNull();
    expect(screen.getAllByText('Schedules').length).toBeGreaterThan(0);
    expect(screen.getByText('start - STG')).toBeTruthy();
    expect(screen.getAllByText('Recent activity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SQL VM').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'View details' }).getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('sub-1 | rg-1 | sqlvm-01')).toBeNull();
    expect(screen.queryByText('No additional Azure config recorded for this stage.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View details' }));
    expect(screen.getByRole('button', { name: 'Hide details' }).getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('sub-1 | rg-1 | sqlvm-01')).toBeTruthy();
    expect(screen.getAllByText('Additional settings').length).toBeGreaterThan(0);
    expect(screen.getByText('workspace')).toBeTruthy();
    expect(screen.getByText('ops')).toBeTruthy();
    expect(screen.queryByText('Azure config')).toBeNull();
  });

  it('does not surface a stale schedule stage label when it no longer resolves to a current stage', async () => {
    mockGetEnvironment.mockResolvedValue({
      id: 'env-1',
      name: 'AIT',
      status: 'stopped',
      client: 'CLIENT-001',
      stages: [
        {
          id: 'stage-1',
          name: 'STG',
          status: 'stopped',
          resourceActions: [],
          notificationGroups: [],
        },
        {
          id: 'stage-2',
          name: 'MDL',
          status: 'stopped',
          resourceActions: [],
          notificationGroups: [],
        },
      ],
      schedules: [
        {
          id: 'sched-legacy',
          action: 'start',
          stage: 'stage1',
          cron: '0 8 * * 1-5',
          timezone: 'UTC',
          enabled: true,
        },
      ],
      activity: {
        entries: [],
      },
    });

    render(
      <MemoryRouter initialEntries={['/environment/env-1']}>
        <Routes>
          <Route path="/environment/:id" element={<EnvironmentDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('AIT')).toBeTruthy();
    expect(screen.getByText('start')).toBeTruthy();
    expect(screen.queryByText('start - stage1')).toBeNull();
  });
});
