import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockMsalInstance = {} as never;
const navigateMock = vi.fn();
const enqueueSnackbarMock = vi.fn();
let authState = { ready: true, isAdmin: true, roles: ['Admin'] };

const { createClientMock, getClientMock, updateClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  getClientMock: vi.fn(),
  updateClientMock: vi.fn(),
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
  createClient: (...args: unknown[]) => createClientMock(...args),
  getClient: (...args: unknown[]) => getClientMock(...args),
  updateClient: (...args: unknown[]) => updateClientMock(...args),
}));

import ClientCreatePage from '../pages/ClientCreatePage';
import ClientEditPage from '../pages/ClientEditPage';

describe('Client pages', () => {
  beforeEach(() => {
    authState = { ready: true, isAdmin: true, roles: ['Admin'] };
    navigateMock.mockReset();
    enqueueSnackbarMock.mockReset();
    createClientMock.mockReset();
    getClientMock.mockReset();
    updateClientMock.mockReset();
    getClientMock.mockResolvedValue({
      id: 'client-001',
      name: 'Client 001',
      shortCode: 'CLIENT-001',
      country: 'CH',
      timezone: 'Europe/Zurich',
      retired: false,
      clientAdmins: [{ type: 'user', id: 'owner@example.com' }],
    });
    createClientMock.mockResolvedValue(undefined);
    updateClientMock.mockResolvedValue(undefined);
  });

  it('keeps create disabled until the required client fields are valid', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <ClientCreatePage />
      </MemoryRouter>,
    );

    const createButton = screen.getByRole('button', { name: 'Create client' });
    expect(createButton.hasAttribute('disabled')).toBe(true);

    await user.click(createButton);

    expect(screen.queryByText('Enter a display name.')).toBeNull();
    expect(screen.queryByText('Enter a short code.')).toBeNull();
    expect(screen.queryByText('Enter a 2-letter country code.')).toBeNull();
    expect(screen.queryByText('Select a timezone.')).toBeNull();
    expect(screen.queryByText('Enter at least one valid client admin email address.')).toBeNull();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('redirects back to the clients list when edit page loading fails', async () => {
    getClientMock.mockRejectedValue(new Error('Failed to load client'));

    render(
      <MemoryRouter initialEntries={['/clients/client-001/edit']}>
        <Routes>
          <Route path="/clients/:id/edit" element={<ClientEditPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith('/clients');
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith('Failed to load client', { variant: 'error' });
  });

  it('shows an error snackbar when update fails from the edit page', async () => {
    const user = userEvent.setup();
    updateClientMock.mockRejectedValue(new Error('Update failed'));

    render(
      <MemoryRouter initialEntries={['/clients/client-001/edit']}>
        <Routes>
          <Route path="/clients/:id/edit" element={<ClientEditPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await screen.findByDisplayValue('Client 001');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(updateClientMock).toHaveBeenCalled();
    });
    expect(enqueueSnackbarMock).toHaveBeenCalledWith('Update failed', { variant: 'error' });
    expect(navigateMock).not.toHaveBeenCalledWith('/clients');
  });
});
