import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockMsalInstance = {} as never;
const navigateMock = vi.fn();

const { listEnvironmentsMock, listSchedulesMock, createScheduleMock, postponeScheduleMock } = vi.hoisted(() => ({
  listEnvironmentsMock: vi.fn(),
  listSchedulesMock: vi.fn(),
  createScheduleMock: vi.fn(),
  postponeScheduleMock: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../api', () => ({
  listEnvironments: (...args: unknown[]) => listEnvironmentsMock(...args),
  listSchedules: (...args: unknown[]) => listSchedulesMock(...args),
  createSchedule: (...args: unknown[]) => createScheduleMock(...args),
  postponeSchedule: (...args: unknown[]) => postponeScheduleMock(...args),
}));

import EnvironmentSchedulesPage from '../pages/EnvironmentSchedulesPage';
import EnvironmentScheduleCreatePage from '../pages/EnvironmentScheduleCreatePage';

describe('Environment schedules pages', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    listEnvironmentsMock.mockReset();
    listSchedulesMock.mockReset();
    createScheduleMock.mockReset();
    postponeScheduleMock.mockReset();

    listEnvironmentsMock.mockResolvedValue({
      environments: [
        {
          id: 'env-1',
          name: 'AIT',
          client: 'CLIENT-001',
          status: 'stopped',
          stages: [
            {
              id: 'stage-1',
              name: 'STG',
              status: 'stopped',
              resourceActions: [{ type: 'sql-vm' }],
              notificationGroups: [{ name: 'Operations', recipients: ['ops@example.com'] }],
              postponementPolicy: { enabled: true, maxPostponeMinutes: 30, maxPostponements: 1 },
            },
          ],
        },
      ],
      total: 1,
      page: 0,
      per_page: 10,
    });
    listSchedulesMock.mockResolvedValue([]);
    createScheduleMock.mockResolvedValue({ id: 'schedule-1' });
    postponeScheduleMock.mockResolvedValue({ id: 'schedule-1' });
  });

  it('shows schedule review with a new schedule action instead of an inline create form', async () => {
    render(
      <MemoryRouter>
        <EnvironmentSchedulesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Environment schedules' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New schedule' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Schedules for the selected stage' })).toBeTruthy();
    expect(screen.queryByText('Define timing, notifications, and postponement for a selected stage.')).toBeNull();
  });

  it('renders a focused create schedule page', async () => {
    render(
      <MemoryRouter initialEntries={['/environment/schedules/create?client=CLIENT-001&environmentId=env-1&stageId=stage-1']}>
        <EnvironmentScheduleCreatePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 1, name: 'Create schedule' })).toBeTruthy();
    expect(screen.getByText('Define timing, notifications, and postponement for a selected stage.')).toBeTruthy();
    expect(screen.getByText('Timing')).toBeTruthy();
    expect(screen.getByLabelText('Day pattern')).toBeTruthy();
    expect(screen.getByLabelText('Time')).toBeTruthy();
    expect(screen.queryByLabelText('Cron')).toBeNull();
    expect(screen.getByRole('button', { name: 'Create schedule' })).toBeTruthy();
  });
});
