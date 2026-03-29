import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const mockMsalInstance = {} as never;
const navigateMock = vi.fn();
const enqueueSnackbarMock = vi.fn();
let authState = { ready: true, isAdmin: true, roles: ['Admin'] };

const { listClientsMock, retireClientMock } = vi.hoisted(() => ({
  listClientsMock: vi.fn(),
  retireClientMock: vi.fn(),
}));

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: mockMsalInstance }),
}));

vi.mock('@/auth/useAuthZ', () => ({
  useAuthZ: () => authState,
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'commerce' }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: (...args: unknown[]) => enqueueSnackbarMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../api', () => ({
  listClients: (...args: unknown[]) => listClientsMock(...args),
  retireClient: (...args: unknown[]) => retireClientMock(...args),
}));

import ClientsPage from '../pages/ClientsPage';

describe('ClientsPage', () => {
  beforeEach(() => {
    authState = { ready: true, isAdmin: true, roles: ['Admin'] };
    navigateMock.mockReset();
    enqueueSnackbarMock.mockReset();
    listClientsMock.mockReset();
    retireClientMock.mockReset();
    listClientsMock.mockResolvedValue({
      clients: [
        {
          id: 'client-001',
          name: 'Client 001',
          shortCode: 'CLIENT-001',
          country: 'CH',
          timezone: 'Europe/Zurich',
          retired: false,
          clientAdmins: [{ type: 'user', id: 'nicol.bitetti@contoso.com' }],
        },
      ],
      total: 1,
      page: 0,
      per_page: 20,
    });
    retireClientMock.mockResolvedValue(undefined);
  });

  it('renders the dedicated clients area and first-release client fields', async () => {
    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Client 001');

    expect(screen.getByRole('heading', { level: 1, name: 'Clients' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New client' })).toBeTruthy();
    expect(screen.getByText('CLIENT-001')).toBeTruthy();
    expect(screen.getByText('CH')).toBeTruthy();
    expect(screen.getByText('Europe/Zurich')).toBeTruthy();
    expect(screen.getByText('nicol.bitetti@contoso.com')).toBeTruthy();
  });

  it('confirms and retires a client', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Client 001');
    await user.click(screen.getByRole('button', { name: 'Retire' }));
    expect(await screen.findByRole('dialog')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Retire client' }));

    await waitFor(() => {
      expect(retireClientMock).toHaveBeenCalledWith(mockMsalInstance, 'client-001');
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith('Client retired', { variant: 'success' });
  });

  it('allows environment managers to manage clients', async () => {
    authState = { ready: true, isAdmin: false, roles: ['EnvironmentManager'] };

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    await screen.findByText('Client 001');

    expect(screen.getByRole('button', { name: 'New client' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Retire' })).toBeTruthy();
  });

  it('shows an empty state when no clients are returned', async () => {
    listClientsMock.mockResolvedValue({
      clients: [],
      total: 0,
      page: 0,
      per_page: 20,
    });

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No clients found. Create the first client record to start using a canonical client identity.')).toBeTruthy();
  });

  it('shows a load error when client retrieval fails', async () => {
    listClientsMock.mockRejectedValue(new Error('Failed to load clients.'));

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Failed to load clients.')).toBeTruthy();
  });
});
