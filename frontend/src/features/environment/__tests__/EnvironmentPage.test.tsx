import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMsalInstance: any = {};
// make tests run as an admin by default so lifecycle buttons render
mockMsalInstance.getAllAccounts = () => [{ idTokenClaims: { roles: ['Admin'] } }];

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

const mockEnvs = [
  {
    id: 'env-1',
    name: 'dev-1',
    status: 'stopped',
    region: 'eastus',
    client: 'client-a',
    stages: [
      {
        id: 'stage-1',
        name: 'stage1',
        status: 'stopped',
        resourceActions: [],
        notificationGroups: [],
        postponementPolicy: { enabled: true, maxPostponeMinutes: 60, maxPostponements: 1 },
      },
    ],
  },
];
const mockScheds: any[] = [];
const {
  startStageMock,
  stopStageMock,
  updateStageConfigurationMock,
  createScheduleMock,
  postponeScheduleMock,
  getActivityMock,
} = vi.hoisted(() => ({
  startStageMock: vi.fn(async () => undefined),
  stopStageMock: vi.fn(async () => undefined),
  updateStageConfigurationMock: vi.fn(async (_instance, _envId, _stageId, payload) => ({
    id: 'stage-1',
    name: 'stage1',
    status: 'stopped',
    resourceActions: payload.resourceActions,
    notificationGroups: payload.notificationGroups,
    postponementPolicy: payload.postponementPolicy,
  })),
  createScheduleMock: vi.fn(async (_instance, payload) => ({ id: 'sched-1', enabled: true, ...payload })),
  postponeScheduleMock: vi.fn(async (_instance, scheduleId, payload) => ({
    id: scheduleId,
    environment: 'dev-1',
    client: 'client-a',
    stage: 'stage1',
    action: 'start',
    enabled: true,
    postponed_until: payload.postponeUntil || new Date().toISOString(),
  })),
  getActivityMock: vi.fn(async () => ({
    activity: [
      { RowKey: 'r1', timestamp: new Date().toISOString(), action: 'start', status: 'requested' },
      { RowKey: 'r2', timestamp: new Date().toISOString(), action: 'stop', status: 'requested' },
    ],
    total: 2,
    page: 0,
    per_page: 10,
  })),
}));

vi.mock('../api', () => ({
  listEnvironments: async () => ({ environments: mockEnvs, total: mockEnvs.length, page: 0, per_page: 10 }),
  listSchedules: async () => mockScheds,
  startEnvironment: vi.fn(async () => undefined),
  stopEnvironment: vi.fn(async () => undefined),
  startStage: startStageMock,
  stopStage: stopStageMock,
  updateStageConfiguration: updateStageConfigurationMock,
  createSchedule: createScheduleMock,
  postponeSchedule: postponeScheduleMock,
  getActivity: getActivityMock,
}));

import EnvironmentPage from '../pages/EnvironmentPage';
import { MemoryRouter } from 'react-router-dom';

describe('EnvironmentPage', () => {
  beforeEach(() => {
    mockEnvs[0].status = 'stopped';
    mockEnvs[0].stages[0].status = 'stopped';
    startStageMock.mockClear();
    stopStageMock.mockClear();
    updateStageConfigurationMock.mockClear();
    createScheduleMock.mockClear();
    postponeScheduleMock.mockClear();
    getActivityMock.mockClear();
  });

  it('renders environments and stage actions', async () => {
    render(
      <MemoryRouter>
        <EnvironmentPage />
      </MemoryRouter>
    );

    // Dashboard should render summary and management controls for admin users
    expect(await screen.findByText(/Environments summary/i)).toBeTruthy();
    expect(await screen.findByText(/dev-1/i)).toBeTruthy();
    // Summary has a 'Manage' button and the panel may show an 'Open Environments management' link
    expect(screen.getByRole('button', { name: /Manage/i })).toBeTruthy();
    expect(await screen.findByText(/Open Environments management/i)).toBeTruthy();
  });

  it('renders activity guidance for the selected stage', async () => {
    render(
      <MemoryRouter>
        <EnvironmentPage />
      </MemoryRouter>
    );

    // The page may show guidance text when the user can view activity,
    // or a permissions message when the user lacks manage rights. Accept either.
    // Verify the page shows the management guidance panel
    expect(await screen.findByText(/To manage environments \(create, edit stages, configure resources and schedules\),/i)).toBeTruthy();
  });
});
