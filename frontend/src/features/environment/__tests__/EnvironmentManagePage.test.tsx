import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockMsalInstance = {} as never;
const navigateMock = vi.fn();
const enqueueSnackbarMock = vi.fn();

const {
  listEnvironmentsMock,
  deleteEnvironmentMock,
} = vi.hoisted(() => ({
  listEnvironmentsMock: vi.fn(),
  deleteEnvironmentMock: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => ({ ready: true, isAdmin: true, roles: ['EnvironmentAdmin'] }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'commerce' }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
}));

vi.mock('@/components/SearchableSelect', () => ({
  default: ({
    options,
    value,
    onChange,
    placeholder,
  }: {
    options: string[];
    value?: string;
    onChange: (value?: string) => void;
    placeholder?: string;
  }) => (
    <select aria-label={placeholder || 'Searchable select'} value={value || ''} onChange={(event) => onChange(event.target.value || undefined)}>
      <option value="">All clients</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  ),
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
  deleteEnvironment: (...args: unknown[]) => deleteEnvironmentMock(...args),
}));

import EnvironmentManagePage from '../pages/EnvironmentManagePage';

describe('EnvironmentManagePage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    enqueueSnackbarMock.mockReset();
    listEnvironmentsMock.mockReset();
    deleteEnvironmentMock.mockReset();

    listEnvironmentsMock.mockResolvedValue({
      environments: [
        {
          id: 'env-1',
          name: 'CLIENT01 - DEV',
          status: 'stopped',
          region: 'eastus',
          client: 'CLIENT 1',
          stages: [{ id: 'stage-1', name: 'default', status: 'stopped', resourceActions: [], notificationGroups: [] }],
        },
      ],
      total: 1,
      page: 0,
      per_page: 10,
    });
    deleteEnvironmentMock.mockResolvedValue(undefined);
  });

  it('renders the page title only once while keeping row actions available', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <EnvironmentManagePage />
      </MemoryRouter>
    );

    await screen.findByRole('button', { name: 'Expand CLIENT 1' });

    expect(screen.getByRole('heading', { level: 1, name: 'Manage environments' })).toBeTruthy();
    expect(screen.getAllByText('Manage environments')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New environment' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'CLIENT 1' })).toBeTruthy();
    expect(screen.queryByText('Environment inventory')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();

    expect(screen.queryByText('CLIENT01 - DEV')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Expand CLIENT 1' }));

    await screen.findByText('CLIENT01 - DEV');
    expect(screen.getByRole('button', { name: 'Details' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });

  it('confirms and deletes an environment from the list', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <EnvironmentManagePage />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: 'Expand CLIENT 1' }));
    await screen.findByText('CLIENT01 - DEV');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(deleteEnvironmentMock).toHaveBeenCalledWith(mockMsalInstance, 'env-1');
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith('Environment deleted', { variant: 'success' });
  });
});
