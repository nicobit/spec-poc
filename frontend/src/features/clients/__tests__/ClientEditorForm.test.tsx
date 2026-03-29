import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ themeId: 'commerce' }),
}));

import ClientEditorForm from '../components/ClientEditorForm';

describe('ClientEditorForm', () => {
  it('turns valid client-admin emails into removable chips while editing', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <ClientEditorForm
        title="Edit client"
        description="Test client editor"
        submitLabel="Save"
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByPlaceholderText('nicol.bitetti@contoso.com, ops.client001@contoso.com');
    await user.type(input, 'owner@example.com,');

    expect(screen.getByText('owner@example.com')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove owner@example.com' })).toBeTruthy();
  });

  it('shows an inline error when an invalid client-admin email is entered', async () => {
    const user = userEvent.setup();

    render(
      <ClientEditorForm
        title="Edit client"
        description="Test client editor"
        submitLabel="Save"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('nicol.bitetti@contoso.com, ops.client001@contoso.com');
    await user.type(input, 'not-an-email');
    await user.tab();

    expect(await screen.findByText('Enter valid email addresses separated by commas. Invalid: not-an-email')).toBeTruthy();
  });

  it('keeps save disabled until the required client fields are valid', async () => {
    const user = userEvent.setup();

    render(
      <ClientEditorForm
        title="Edit client"
        description="Test client editor"
        submitLabel="Save"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const saveButton = screen.getByRole('button', { name: 'Save' });
    expect(saveButton.hasAttribute('disabled')).toBe(true);

    await user.click(saveButton);

    expect(screen.queryByText('Enter a display name.')).toBeNull();
    expect(screen.queryByText('Enter a short code.')).toBeNull();
    expect(screen.queryByText('Enter a 2-letter country code.')).toBeNull();
    expect(screen.queryByText('Select a timezone.')).toBeNull();
    expect(screen.queryByText('Enter at least one valid client admin email address.')).toBeNull();
  });

  it('removes the last email chip with backspace when the input is empty', async () => {
    const user = userEvent.setup();

    render(
      <ClientEditorForm
        title="Edit client"
        description="Test client editor"
        submitLabel="Save"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const input = screen.getByPlaceholderText('nicol.bitetti@contoso.com, ops.client001@contoso.com');
    await user.type(input, 'owner@example.com,');
    expect(screen.getByText('owner@example.com')).toBeTruthy();

    await user.click(input);
    await user.keyboard('{Backspace}');

    expect(screen.queryByText('owner@example.com')).toBeNull();
  });
});
