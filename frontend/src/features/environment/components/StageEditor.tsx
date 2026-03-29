import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, GripVertical, Info, Layers, Plus, Trash2 } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import ConfirmDialog from '@/components/ConfirmDialog';
import { themeClasses } from '@/theme/themeClasses';

import type { EnvironmentStage } from '../api';

type Props = {
  stages: EnvironmentStage[];
  onChange: (stages: EnvironmentStage[]) => void;
};

type ConfirmState = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => Promise<void> | void;
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
  return <label className={`block ${themeClasses.fieldLabel}`}>{children}</label>;
}

function StageSummary({ stage }: { stage: EnvironmentStage }) {
  const resourceCount = stage.resourceActions?.length || 0;

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
        {resourceCount} Azure service action{resourceCount === 1 ? '' : 's'}
      </span>
      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        {stage.status}
      </span>
    </div>
  );
}

function getResourceTypeLabel(type: string) {
  switch (type) {
    case 'sql-vm':
      return 'SQL VM';
    case 'sql-managed-instance':
      return 'SQL Managed Instance';
    case 'synapse-sql-pool':
      return 'Synapse SQL Pool';
    case 'service-bus-message':
      return 'Service Bus message';
    default:
      return type;
  }
}

function getResourceSummary(action: Record<string, any>) {
  switch (action.type) {
    case 'sql-vm':
      return [action.subscriptionId, action.resourceGroup, action.serverName].filter(Boolean).join(' | ');
    case 'sql-managed-instance':
      return [action.subscriptionId, action.resourceGroup, action.instanceName].filter(Boolean).join(' | ');
    case 'synapse-sql-pool':
      return [action.subscriptionId, action.workspaceName, action.sqlPoolName].filter(Boolean).join(' | ');
    case 'service-bus-message':
      return [action.namespace, action.queueOrTopic, action.messageType].filter(Boolean).join(' | ');
    default:
      return '';
  }
}

function isResourceIncomplete(action: Record<string, any>) {
  switch (action.type) {
    case 'sql-vm':
      return !action.subscriptionId || !action.resourceGroup || !action.serverName;
    case 'sql-managed-instance':
      return !action.subscriptionId || !action.resourceGroup || !action.instanceName;
    case 'synapse-sql-pool':
      return !action.subscriptionId || !action.workspaceName || !action.sqlPoolName;
    case 'service-bus-message':
      return !action.namespace || !action.queueOrTopic || !action.messageType;
    default:
      return false;
  }
}

function WarningChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={`${themeClasses.warningChip} px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em]`}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function EmptyServicesNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`${themeClasses.emptyState} ${
        compact ? 'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs' : 'rounded-2xl px-4 py-4 text-sm'
      }`}
    >
      <Info className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      <div className={compact ? '' : 'space-y-1'}>
        <div className={compact ? 'text-[var(--text-secondary)]' : 'font-medium text-[var(--text-primary)]'}>
          No Azure services configured yet
        </div>
        {!compact ? (
          <div className={themeClasses.helperText}>
            Add an Azure service when this stage needs managed resources or messaging.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function StageEditor({ stages, onChange }: Props) {
  const [openStageId, setOpenStageId] = React.useState<string | null>(null);
  const [confirmState, setConfirmState] = React.useState<ConfirmState>({ open: false });

  React.useEffect(() => {
    if (stages.length === 0) {
      setOpenStageId(null);
      return;
    }
    if (openStageId && stages.some((stage) => stage.id === openStageId)) {
      return;
    }
    setOpenStageId(null);
  }, [stages, openStageId]);

  const updateStage = (index: number, patch: Partial<EnvironmentStage>) => {
    onChange(stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)));
  };

  const addStage = () => {
    const stage = newStage();
    setOpenStageId(stage.id);
    onChange([...stages, stage]);
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

  const requestRemoveStage = (stage: EnvironmentStage, index: number) => {
    const resourceCount = stage.resourceActions?.length || 0;
    const serviceTypes = Array.from(new Set((stage.resourceActions || []).map((resourceAction) => getResourceTypeLabel(resourceAction.type))));
    const details = [
      `Stage: ${stage.name?.trim() || `Stage ${index + 1}`}`,
      `${resourceCount} Azure service action${resourceCount === 1 ? '' : 's'}`,
      serviceTypes.length > 0 ? `Service types: ${serviceTypes.join(', ')}` : 'No Azure services configured yet',
    ].join('\n');

    setConfirmState({
      open: true,
      title: 'Remove stage',
      message: `This will remove the following stage:\n\n${details}`,
      confirmLabel: 'Remove stage',
      onConfirm: () => removeStage(index),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className={themeClasses.sectionEyebrow}>Stages</div>
          <p className={`${themeClasses.helperText} mt-2 max-w-4xl`}>
            Define one or more stages, then add the Azure services each stage needs to start, stop, or send messages.
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
        <div className={`${themeClasses.emptyState} rounded-3xl px-5 py-10 text-center`}>
          <div className="text-base font-medium text-[var(--text-primary)]">No stages yet</div>
          <p className={`${themeClasses.helperText} mt-2`}>
            Add a stage to start defining the Azure services used by this environment.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const incompleteCount = stage.resourceActions.filter((resourceAction) => isResourceIncomplete(resourceAction)).length;

            return (
            <article
              key={stage.id}
              className={`rounded-3xl p-5 transition-all duration-200 ${
                openStageId === stage.id
                  ? `${themeClasses.stageCardAccent} shadow-[0_18px_36px_color-mix(in_srgb,var(--accent-primary)_10%,transparent)]`
                  : `${themeClasses.stageCard} opacity-90`
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subsection)] text-[var(--text-secondary)]">
                      <GripVertical className="h-4 w-4" />
                    </span>
                    <div>
                      <div className={themeClasses.sectionEyebrow}>Stage {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                        {stage.name?.trim() || `Stage ${index + 1}`}
                      </div>
                    </div>
                  </div>
                  <StageSummary stage={stage} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {stage.resourceActions.length > 0 ? (
                      <>
                        {Array.from(new Set(stage.resourceActions.map((resourceAction) => getResourceTypeLabel(resourceAction.type)))).map((type) => (
                          <span
                            key={type}
                            className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                          >
                            {type}
                          </span>
                        ))}
                        {incompleteCount > 0 ? (
                          <WarningChip>{incompleteCount} incomplete</WarningChip>
                        ) : null}
                      </>
                    ) : (
                      <EmptyServicesNotice compact />
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                    aria-expanded={openStageId === stage.id}
                    aria-controls={`stage-editor-details-${stage.id}`}
                    onClick={() => setOpenStageId((current) => (current === stage.id ? null : stage.id))}
                  >
                    {openStageId === stage.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {openStageId === stage.id ? 'Hide details' : 'Edit stage details'}
                  </button>
                  <button
                    aria-label="Remove stage"
                    className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                    onClick={() => requestRemoveStage(stage, index)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>

              {openStageId === stage.id ? (
                <div
                  id={`stage-editor-details-${stage.id}`}
                  className="mt-5 rounded-2xl border border-[var(--border-stage-accent)] bg-[var(--surface-elevated)] p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <div className={themeClasses.sectionEyebrow}>Stage settings</div>
                      <div className={`${themeClasses.helperText} mt-1`}>
                        Update the stage name and manage the Azure services configured for this stage.
                      </div>
                      {incompleteCount > 0 ? (
                        <div className="mt-3">
                          <WarningChip>
                            {incompleteCount} Azure service{incompleteCount === 1 ? '' : 's'} still need completion
                          </WarningChip>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)]">
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
                      <div className={themeClasses.fieldLabel}>Azure services</div>
                    </div>
                    <ResourceActionsEditor
                      actions={stage.resourceActions || []}
                      onChangeActions={(actions) => updateStage(index, { resourceActions: actions })}
                    />
                  </div>
                </div>
              ) : null}
            </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={async () => {
          const handler = confirmState.onConfirm;
          setConfirmState({ open: false });
          if (handler) await handler();
        }}
        onCancel={() => setConfirmState({ open: false })}
      />
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
  const [expanded, setExpanded] = React.useState<boolean[]>(() => (actions && actions.length ? actions.map(() => false) : []));
  const [confirmState, setConfirmState] = React.useState<ConfirmState>({ open: false });

  React.useEffect(() => {
    const nextLocal = actions && actions.length ? actions : [];
    setLocal(nextLocal);
    setExpanded((current) => nextLocal.map((_, index) => current[index] ?? false));
  }, [actions]);

  const update = (index: number, patch: Partial<any>) => {
    const next = local.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    setLocal(next);
    onChangeActions(next);
  };

  const add = () => {
    const next = [...local, { id: undefined, type: 'sql-vm' }];
    setLocal(next);
    setExpanded((current) => [...current.map((value) => value), true]);
    onChangeActions(next);
  };

  const remove = (index: number) => {
    const next = local.filter((_, itemIndex) => itemIndex !== index);
    setLocal(next);
    setExpanded((current) => current.filter((_, itemIndex) => itemIndex !== index));
    onChangeActions(next);
  };

  const requestRemove = (item: any, index: number) => {
    const summary = getResourceSummary(item);
    const details = [
      `Azure service: ${getResourceTypeLabel(item.type)}`,
      summary || 'Configuration details not completed yet',
    ].join('\n');

    setConfirmState({
      open: true,
      title: 'Remove Azure service',
      message: `This will remove the following Azure service:\n\n${details}`,
      confirmLabel: 'Remove Azure service',
      onConfirm: () => remove(index),
    });
  };

  const toggleExpanded = (index: number) => {
    setExpanded((current) => current.map((value, itemIndex) => (itemIndex === index ? !value : value)));
  };

  return (
    <div className="space-y-3">
      {local.length === 0 ? (
        <EmptyServicesNotice />
      ) : null}

      {local.map((item, index) => (
        <section key={`${item.type}-${index}`} className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                  aria-expanded={expanded[index] === true}
                  aria-controls={`azure-service-editor-${index}`}
                  onClick={() => toggleExpanded(index)}
                >
                  {expanded[index] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {expanded[index] ? 'Hide details' : 'View details'}
                </button>
                <div className={themeClasses.sectionEyebrow}>Azure service {index + 1}</div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                  {getResourceTypeLabel(item.type)}
                </span>
                {isResourceIncomplete(item) ? (
                  <WarningChip>Incomplete</WarningChip>
                ) : null}
              </div>
              <div className={`${themeClasses.helperText} mt-2`}>
                {getResourceSummary(item) || 'Complete the fields required for this integration.'}
              </div>
            </div>
            <button
              aria-label="Remove Azure service"
              className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
              onClick={() => requestRemove(item, index)}
            >
              Remove
            </button>
          </div>

          {expanded[index] ? (
            <div id={`azure-service-editor-${index}`} className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <FieldLabel>Azure service type</FieldLabel>
                <select
                  aria-label="Azure service type"
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
          ) : null}
        </section>
      ))}

      <button
        aria-label="Add Azure service"
        type="button"
        className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
        onClick={add}
      >
        <Plus className="h-4 w-4" />
        Add Azure service
      </button>

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel}
        onConfirm={async () => {
          const handler = confirmState.onConfirm;
          setConfirmState({ open: false });
          if (handler) await handler();
        }}
        onCancel={() => setConfirmState({ open: false })}
      />
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
