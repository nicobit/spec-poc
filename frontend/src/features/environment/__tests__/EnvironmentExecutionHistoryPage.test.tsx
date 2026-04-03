import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMsalInstance = {} as never;

const { mockGetEnvironment, mockListEnvironmentExecutions } = vi.hoisted(() => ({
  mockGetEnvironment: vi.fn(),
  mockListEnvironmentExecutions: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => ({ ready: true, isAdmin: true, roles: ['EnvironmentAdmin'] }),
}));

vi.mock('../api', async () => {
  const actual = await vi.importActual<typeof import('../api')>('../api');
  return {
    ...actual,
    getEnvironment: (...args: unknown[]) => mockGetEnvironment(...args),
    listEnvironmentExecutions: (...args: unknown[]) => mockListEnvironmentExecutions(...args),
  };
});

import EnvironmentExecutionHistoryPage from '../pages/EnvironmentExecutionHistoryPage';

describe('EnvironmentExecutionHistoryPage', () => {
  beforeEach(() => {
    mockGetEnvironment.mockReset();
    mockListEnvironmentExecutions.mockReset();
  });

  function primeEnvironment() {
    mockGetEnvironment.mockResolvedValue({
      id: 'env-1',
      name: 'DEV',
      status: 'stopped',
      client: 'CLIENT-001',
      stages: [
        { id: 'stage-1', name: 'STG', status: 'stopped', resourceActions: [], notificationGroups: [] },
        { id: 'stage-2', name: 'MDL', status: 'stopped', resourceActions: [], notificationGroups: [] },
      ],
    });
  }

  it('renders execution history with filters and expandable action results', async () => {
    primeEnvironment();
    mockListEnvironmentExecutions.mockResolvedValue({
      environmentId: 'env-1',
      total: 2,
      executions: [
        {
          id: 'exec-1',
          executionId: 'exec-1',
          clientId: 'client-1',
          environmentId: 'env-1',
          stageId: 'stage-1',
          stageName: 'STG',
          action: 'start',
          source: 'schedule',
          requestedAt: '2026-03-29T10:00:00Z',
          completedAt: '2026-03-29T10:05:00Z',
          status: 'succeeded',
          message: 'Execution completed successfully.',
          resourceActionResults: [
            {
              resourceActionId: 'ra-1',
              type: 'sql-vm',
              status: 'succeeded',
              subscriptionId: 'sub-1',
              region: 'westeurope',
              resourceIdentifier: 'sqlvm-01',
              message: 'Started successfully.',
            },
          ],
        },
        {
          id: 'exec-2',
          executionId: 'exec-2',
          clientId: 'client-1',
          environmentId: 'env-1',
          stageId: 'stage-2',
          stageName: 'MDL',
          action: 'stop',
          source: 'portal',
          requestedAt: '2026-03-29T11:00:00Z',
          completedAt: '2026-03-29T11:05:00Z',
          status: 'failed',
          message: 'Synapse pause failed.',
          resourceActionResults: [],
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={['/environment/env-1/executions']}>
        <Routes>
          <Route path="/environment/:id/executions" element={<EnvironmentExecutionHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Environment execution history')).toBeTruthy();
    expect(await screen.findByText('Track scheduled and manual runs, including failures and per-resource results.')).toBeTruthy();
    expect(screen.getByText('start - STG')).toBeTruthy();
    expect(screen.getByText('stop - MDL')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } });
    expect(screen.queryByText('start - STG')).toBeNull();
    expect(screen.getByText('stop - MDL')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'all' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'View action results' })[0]!);
    expect(screen.getByText('sub-1 | westeurope | sqlvm-01')).toBeTruthy();
    expect(screen.getByText('Started successfully.')).toBeTruthy();
  });

  it('shows empty state when no executions exist', async () => {
    primeEnvironment();
    mockListEnvironmentExecutions.mockResolvedValue({
      environmentId: 'env-1',
      total: 0,
      executions: [],
    });

    render(
      <MemoryRouter initialEntries={['/environment/env-1/executions']}>
        <Routes>
          <Route path="/environment/:id/executions" element={<EnvironmentExecutionHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('No executions match the current filters yet.')).toBeTruthy();
  });

  it('shows load error state when execution history cannot be loaded', async () => {
    primeEnvironment();
    mockListEnvironmentExecutions.mockRejectedValue(new Error('boom'));

    render(
      <MemoryRouter initialEntries={['/environment/env-1/executions']}>
        <Routes>
          <Route path="/environment/:id/executions" element={<EnvironmentExecutionHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Failed to load execution history. boom')).toBeTruthy();
  });

  it('paginates the execution history list', async () => {
    primeEnvironment();
    mockListEnvironmentExecutions.mockResolvedValue({
      environmentId: 'env-1',
      total: 11,
      executions: Array.from({ length: 11 }, (_, index) => ({
        id: `exec-${index + 1}`,
        executionId: `exec-${index + 1}`,
        clientId: 'client-1',
        environmentId: 'env-1',
        stageId: 'stage-1',
        stageName: 'STG',
        action: index % 2 === 0 ? 'start' : 'stop',
        source: 'schedule',
        requestedAt: `2026-03-29T1${index}:00:00Z`,
        completedAt: `2026-03-29T1${index}:05:00Z`,
        status: 'succeeded',
        message: `Execution ${index + 1}`,
        resourceActionResults: [],
      })),
    });

    render(
      <MemoryRouter initialEntries={['/environment/env-1/executions']}>
        <Routes>
          <Route path="/environment/:id/executions" element={<EnvironmentExecutionHistoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Page 1 of 2')).toBeTruthy();
    expect(screen.queryByText('Execution 11')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Page 2 of 2')).toBeTruthy();
    expect(screen.getByText('Execution 11')).toBeTruthy();
  });
});
