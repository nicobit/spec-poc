import React from 'react';
import { GripVertical, Layers, Plus, Trash2 } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import { themeClasses } from '@/theme/themeClasses';

import type { EnvironmentStage } from '../api';

type Props = {
  stages: EnvironmentStage[];
  onChange: (stages: EnvironmentStage[]) => void;
};

function newStage(): EnvironmentStage {
  return {
    id: `stage-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    name: 'New stage',
    status: 'stopped',
    resourceActions: [],
    notificationGroups: [],
    azureConfig: {},
  } as EnvironmentStage;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-[var(--text-primary)]">{children}</label>;
}

function StageSummary({ stage }: { stage: EnvironmentStage }) {
  const resourceCount = stage.resourceActions?.length || 0;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
        {resourceCount} resource action{resourceCount === 1 ? '' : 's'}
      </span>
      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {stage.status}
      </span>
    </div>
  );
}

export default function StageEditor({ stages, onChange }: Props) {
  const updateStage = (index: number, patch: Partial<EnvironmentStage>) => {
    onChange(stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)));
  };

  const addStage = () => {
    onChange([...stages, newStage()]);
  };

  const removeStage = (index: number) => {
    const removed = stages[index];
    const next = stages.filter((_, stageIndex) => stageIndex !== index);
    onChange(next);

    enqueueSnackbar('Stage removed', {
      variant: 'info',
      action: () => (
        <button
          className="ui-button-secondary rounded px-2 py-1 text-sm"
          onClick={() => {
            const restored = [...next.slice(0, index), removed, ...next.slice(index)];
            onChange(restored);
          }}
        >
          Undo
        </button>
      ),
      autoHideDuration: 6000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Stages</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Define one or more stages, then add the Azure resources needed for each stage workflow.
          </p>
        </div>
        <button
          className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
          onClick={addStage}
        >
          <Plus className="h-4 w-4" />
          Add stage
        </button>
      </div>

      {stages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] px-5 py-10 text-center">
          <div className="text-base font-medium text-[var(--text-primary)]">No stages yet</div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Add a stage to start defining the resources and actions for this environment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <article key={stage.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] ui-text-muted">
                    <GripVertical className="h-4 w-4" />
                    Stage {index + 1}
                  </div>
                  <StageSummary stage={stage} />
                </div>
                <button
                  aria-label="Remove stage"
                  className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                  onClick={() => removeStage(index)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)]">
                <div>
                  <FieldLabel>Stage name</FieldLabel>
                  <input
                    aria-label="Stage name"
                    className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                    value={stage.name}
                    onChange={(event) => updateStage(index, { name: event.target.value })}
                  />
                </div>
              </div>

              <div className="mt-5">
                <div className="mb-3 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
                  <div className="text-sm font-medium text-[var(--text-primary)]">Resources</div>
                </div>
                <ResourceActionsEditor
                  actions={stage.resourceActions || []}
                  onChangeActions={(actions) => updateStage(index, { resourceActions: actions })}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceActionsEditor({
  actions,
  onChangeActions,
}: {
  actions: any[];
  onChangeActions: (actions: any[]) => void;
}) {
  const [local, setLocal] = React.useState(actions && actions.length ? actions : []);

  React.useEffect(() => setLocal(actions && actions.length ? actions : []), [actions]);

  const update = (index: number, patch: Partial<any>) => {
    const next = local.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    setLocal(next);
    onChangeActions(next);
  };

  const add = () => {
    const next = [...local, { id: undefined, type: 'sql-vm' }];
    setLocal(next);
    onChangeActions(next);
  };

  const remove = (index: number) => {
    const next = local.filter((_, itemIndex) => itemIndex !== index);
    setLocal(next);
    onChangeActions(next);
  };

  return (
    <div className="space-y-3">
      {local.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] px-4 py-6 text-sm text-[var(--text-secondary)]">
          No resources yet. Add the Azure resource actions required for this stage.
        </div>
      ) : null}

      {local.map((item, index) => (
        <section key={`${item.type}-${index}`} className="ui-panel-muted rounded-2xl p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Resource {index + 1}</div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">Choose the resource type and complete the fields required for that integration.</div>
            </div>
            <button
              aria-label="Remove resource"
              className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
              onClick={() => remove(index)}
            >
              Remove
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <FieldLabel>Resource type</FieldLabel>
              <select
                aria-label="Resource type"
                className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                value={item.type}
                onChange={(event) => update(index, { type: event.target.value })}
              >
                <option value="sql-vm">SQL VM</option>
                <option value="sql-managed-instance">SQL Managed Instance</option>
                <option value="synapse-sql-pool">Synapse SQL Pool</option>
                <option value="service-bus-message">Service Bus message</option>
              </select>
            </div>

            {item.type === 'sql-vm' ? (
              <>
                <FormField label="Subscription ID" value={item.subscriptionId || ''} onChange={(value) => update(index, { subscriptionId: value })} />
                <FormField label="Resource group" value={item.resourceGroup || ''} onChange={(value) => update(index, { resourceGroup: value })} />
                <div className="lg:col-span-2">
                  <FormField label="Server name" value={item.serverName || ''} onChange={(value) => update(index, { serverName: value })} />
                </div>
              </>
            ) : null}

            {item.type === 'sql-managed-instance' ? (
              <>
                <FormField label="Subscription ID" value={item.subscriptionId || ''} onChange={(value) => update(index, { subscriptionId: value })} />
                <FormField label="Resource group" value={item.resourceGroup || ''} onChange={(value) => update(index, { resourceGroup: value })} />
                <div className="lg:col-span-2">
                  <FormField label="Instance name" value={item.instanceName || ''} onChange={(value) => update(index, { instanceName: value })} />
                </div>
              </>
            ) : null}

            {item.type === 'synapse-sql-pool' ? (
              <>
                <FormField label="Subscription ID" value={item.subscriptionId || ''} onChange={(value) => update(index, { subscriptionId: value })} />
                <FormField label="Workspace name" value={item.workspaceName || ''} onChange={(value) => update(index, { workspaceName: value })} />
                <div className="lg:col-span-2">
                  <FormField label="SQL pool name" value={item.sqlPoolName || ''} onChange={(value) => update(index, { sqlPoolName: value })} />
                </div>
              </>
            ) : null}

            {item.type === 'service-bus-message' ? (
              <>
                <FormField
                  label="Service Bus namespace"
                  ariaLabel="Service Bus namespace"
                  value={item.namespace || ''}
                  onChange={(value) => update(index, { namespace: value })}
                />
                <FormField
                  label="Message type"
                  value={item.messageType || ''}
                  onChange={(value) => update(index, { messageType: value })}
                />
                <div className="lg:col-span-2">
                  <FormField
                    label="Service Bus entity name"
                    ariaLabel="Service Bus entity name"
                    value={item.queueOrTopic || ''}
                    onChange={(value) => update(index, { queueOrTopic: value })}
                  />
                </div>
              </>
            ) : null}
          </div>
        </section>
      ))}

      <button
        aria-label="Add resource"
        type="button"
        className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
        onClick={add}
      >
        <Plus className="h-4 w-4" />
        Add resource
      </button>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        aria-label={ariaLabel || label}
        className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
