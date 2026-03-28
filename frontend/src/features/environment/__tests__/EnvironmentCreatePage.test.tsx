import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@azure/msal-react', () => ({
  useMsal: () => ({ instance: {} }),
}));

vi.mock('notistack', () => ({
  enqueueSnackbar: vi.fn(),
}));

import EnvironmentCreatePage from '../pages/EnvironmentCreatePage';

describe('EnvironmentCreatePage', () => {
  it('renders the redesigned create form sections', () => {
    render(
      <MemoryRouter>
        <EnvironmentCreatePage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Create Environment' })).toBeTruthy();
    expect(screen.getByText('Environment details')).toBeTruthy();
    expect(screen.getByText('Configuration summary')).toBeTruthy();
    expect(screen.getByText('Stages')).toBeTruthy();
    expect(screen.queryByText('Type')).toBeNull();
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(screen.getByLabelText('Client')).toBeTruthy();
    expect(screen.getByLabelText('Lifecycle')).toBeTruthy();
  });
});
