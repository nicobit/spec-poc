import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockMsalInstance: any = {};
mockMsalInstance.getAllAccounts = () => [{ idTokenClaims: { roles: ['Admin'] } }];

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

const environmentList = [
  {
    id: 'env-1',
    name: 'DEV',
    client: 'Client 001',
    status: 'stopped',
    stages: [
      { id: 'stage-1', name: 'STG', status: 'running', resourceActions: [], notificationGroups: [] },
    ],
  },
  {
    id: 'env-2',
    name: 'PRD',
    client: 'Client 002',
    status: 'stopped',
    stages: [
      { id: 'stage-2', name: 'LIVE', status: 'stopped', resourceActions: [], notificationGroups: [] },
    ],
  },
];

const environmentDetails = {
  'env-1': {
    id: 'env-1',
    name: 'DEV',
    client: 'Client 001',
    status: 'stopped',
    stages: [
      {
        id: 'stage-1',
        name: 'STG',
        status: 'running',
        resourceActions: [
          {
            id: 'ra-1',
            type: 'service-bus-message',
            subscriptionId: 'sub-1',
            resourceGroup: 'rg-app',
            region: 'westeurope',
            properties: {
              namespace: 'ns-1',
              entityType: 'queue',
              entityName: 'lifecycle',
              messageTemplate: 'start',
            },
          },
        ],
        notificationGroups: [],
        executions: [
          {
            id: 'exec-1',
            executionId: 'exec-1',
            clientId: 'client-1',
            environmentId: 'env-1',
            stageId: 'stage-1',
            action: 'start',
            source: 'schedule',
            requestedAt: '2026-03-30T08:00:00Z',
            status: 'failed',
            resourceActionResults: [],
          },
        ],
      },
    ],
    schedules: [
      {
        id: 'sched-1',
        environment: 'DEV',
        client: 'Client 001',
        stage: 'STG',
        action: 'start',
        enabled: true,
        timezone: 'Europe/Zurich',
        next_run: '2026-03-30T10:00:00Z',
      },
    ],
  },
  'env-2': {
    id: 'env-2',
    name: 'PRD',
    client: 'Client 002',
    status: 'stopped',
    stages: [
      {
        id: 'stage-2',
        name: 'LIVE',
        status: 'stopped',
        resourceActions: [
          {
            id: 'ra-2',
            type: 'sql-vm',
            subscriptionId: 'sub-1',
            resourceGroup: 'rg-db',
            region: 'westeurope',
            properties: {},
          },
        ],
        notificationGroups: [],
        executions: [
          {
            id: 'exec-2',
            executionId: 'exec-2',
            clientId: 'client-2',
            environmentId: 'env-2',
            stageId: 'stage-2',
            action: 'stop',
            source: 'portal',
            requestedAt: '2026-03-30T07:00:00Z',
            status: 'succeeded',
            resourceActionResults: [],
          },
        ],
      },
    ],
    schedules: [],
  },
};

vi.mock('../api', () => ({
  listEnvironments: vi.fn(async () => ({
    environments: environmentList,
    total: environmentList.length,
    page: 0,
    per_page: 10,
  })),
  getEnvironment: vi.fn(async (_instance, id: string) => environmentDetails[id as keyof typeof environmentDetails]),
  listSchedules: vi.fn(async () => [
    {
      id: 'sched-1',
      environment: 'DEV',
      client: 'Client 001',
      stage: 'STG',
      action: 'start',
      enabled: true,
      timezone: 'Europe/Zurich',
      next_run: '2026-03-30T10:00:00Z',
    },
  ]),
}));

import EnvironmentPage from '../pages/EnvironmentPage';

describe('EnvironmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the environments dashboard overview and quick links', async () => {
    render(
      <MemoryRouter>
        <EnvironmentPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Environments dashboard/i)).toBeTruthy();
    expect(await screen.findByText(/Upcoming scheduled actions/i)).toBeTruthy();
    expect(await screen.findByText(/Recent execution outcomes/i)).toBeTruthy();
    expect(await screen.findByRole('link', { name: /Open Environments management/i })).toBeTruthy();
    expect(document.querySelector('a[href="/environment/schedules"]')).toBeTruthy();
  });

  it('surfaces attention panels for failures, incomplete setup, and missing schedules', async () => {
    render(
      <MemoryRouter>
        <EnvironmentPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Failed executions/i)).toBeTruthy();
    expect((await screen.findAllByText(/Incomplete setup/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/1 incomplete Azure service field/i)).toBeTruthy();
    expect(await screen.findByText(/No schedules/i)).toBeTruthy();
    expect(await screen.findByText(/No enabled schedule is configured yet/i)).toBeTruthy();
  });
});
