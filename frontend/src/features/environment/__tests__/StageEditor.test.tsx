import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StageEditor from '../components/StageEditor';
import { vi } from 'vitest';
// mock notistack used by StageEditor
vi.mock('notistack', () => ({ enqueueSnackbar: vi.fn() }));

// jsdom doesn't implement scrollIntoView; noop it for tests
if (typeof window !== 'undefined' && window.HTMLElement && !window.HTMLElement.prototype.scrollIntoView) {
  // @ts-ignore
  window.HTMLElement.prototype.scrollIntoView = function() {};
}
import { MemoryRouter } from 'react-router-dom';

describe('StageEditor', () => {
  it('adds, edits and removes stages and parses azureConfig', async () => {
    // Use a wrapper component to hold state so StageEditor receives updated props
    function Wrapper() {
      const [s, setS] = React.useState<any[]>([]);
      return <StageEditor stages={s} onChange={setS} />;
    }

    render(
      <MemoryRouter>
        <Wrapper />
      </MemoryRouter>
    );

    // Add a stage
    const addBtn = screen.getByRole('button', { name: /Add stage/i });
    fireEvent.click(addBtn);
    // Now input should appear
    const nameInput = await screen.findByLabelText(/Stage name/i) as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    expect(screen.getByRole('button', { name: /Hide details/i })).toBeTruthy();

    // Edit stage name
    fireEvent.change(nameInput, { target: { value: 'My Stage' } });
    expect((nameInput).value).toBe('My Stage');

    // Resource editor should be present; add a resource and fill fields
    const addResourceBtn = await screen.findByRole('button', { name: /Add Azure service/i });
    fireEvent.click(addResourceBtn);
    const resourceType = await screen.findByLabelText(/Azure service type/i) as HTMLSelectElement;
    expect(resourceType).toBeTruthy();
    // switch to Service Bus type and fill namespace + entity
    fireEvent.change(resourceType, { target: { value: 'service-bus-message' } });
    const sbNamespace = await screen.findByLabelText(/Service Bus namespace/i) as HTMLInputElement;
    const sbEntityName = await screen.findByLabelText(/Service Bus entity name/i) as HTMLInputElement;
    fireEvent.change(sbNamespace, { target: { value: 'sb-ns' } });
    fireEvent.change(sbEntityName, { target: { value: 'my-queue' } });
    expect(sbNamespace.value).toBe('sb-ns');
    expect(sbEntityName.value).toBe('my-queue');

    fireEvent.click(screen.getAllByRole('button', { name: /Hide details/i })[1]);
    expect(screen.queryByLabelText(/Service Bus namespace/i)).toBeNull();
    expect(screen.getAllByText('Service Bus message').length).toBeGreaterThan(0);
    expect(screen.getByText('sb-ns | my-queue')).toBeTruthy();

    const removeServiceBtn = screen.getByRole('button', { name: /Remove Azure service/i });
    fireEvent.click(removeServiceBtn);
    const serviceDialog = await screen.findByRole('dialog');
    expect(within(serviceDialog).getByText(/This will remove the following Azure service/i)).toBeTruthy();
    expect(within(serviceDialog).getByText(/Azure service: Service Bus message/i)).toBeTruthy();
    expect(within(serviceDialog).getByText(/sb-ns \| my-queue/i)).toBeTruthy();
    fireEvent.click(within(serviceDialog).getByRole('button', { name: /Remove Azure service/i }));
    expect(screen.queryByText(/This will remove the following Azure service/i)).toBeNull();
    expect(screen.queryByText('sb-ns | my-queue')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Hide details/i }));
    expect(screen.queryByLabelText(/Stage name/i)).toBeNull();
    expect(screen.getByRole('button', { name: /Edit stage details/i })).toBeTruthy();

    // Remove stage
    const removeBtn = screen.getByRole('button', { name: /Remove stage/i });
    fireEvent.click(removeBtn);
    const stageDialog = await screen.findByRole('dialog');
    expect(screen.getByText(/This will remove the following stage/i)).toBeTruthy();
    expect(screen.getByText(/Stage: My Stage/i)).toBeTruthy();
    fireEvent.click(within(stageDialog).getByRole('button', { name: /^Remove stage$/i }));
    expect(screen.queryByLabelText(/Stage name/i)).toBeNull();
  });
});
