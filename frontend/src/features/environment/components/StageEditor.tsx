import React from 'react';
import { createPortal } from 'react-dom';
import type { IPublicClientApplication } from '@azure/msal-browser';
import { AlertTriangle, ChevronDown, ChevronRight, GripVertical, Info, Layers, Loader2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import ConfirmDialog from '@/components/ConfirmDialog';
import { themeClasses } from '@/theme/themeClasses';

import type { EnvironmentStage } from '../api';
import {
  listAzureSubscriptions,
  listAzureResourceGroups,
  listAzureSqlVms,
  listAzureSqlManagedInstances,
  listAzureSynapseWorkspaces,
  listAzureSynapseSqlPools,
  listAzureServiceBusNamespaces,
  listAzureServiceBusEntities,
  listAzureWebApps,
  listAzureContainerGroups,
} from '../api.azure-lookup';

type Props = {
  stages: EnvironmentStage[];
  onChange: (stages: EnvironmentStage[]) => void;
  msalInstance: IPublicClientApplication;
  onBladeOpenChange?: (open: boolean) => void;
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
    name: '',
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

  function getResourceActionLabel(action: Record<string, any>) {
    if (!action) return '';
    switch (action.type) {
      case 'sql-vm':
        return action.serverName || action.name || getResourceTypeLabel(action.type);
      case 'sql-managed-instance':
        return action.instanceName || action.name || getResourceTypeLabel(action.type);
      case 'synapse-sql-pool':
        return action.sqlPoolName || action.name || getResourceTypeLabel(action.type);
      case 'service-bus-message':
        return action.queueOrTopic || action.name || getResourceTypeLabel(action.type);
      case 'app-service':
        return action.siteName || action.name || getResourceTypeLabel(action.type);
      case 'container-instance':
        return action.containerGroupName || action.name || getResourceTypeLabel(action.type);
      default:
        return action.name || getResourceTypeLabel(action.type);
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

export default function StageEditor({ stages, onChange, msalInstance, onBladeOpenChange }: Props) {
  const [openStageId, setOpenStageId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<EnvironmentStage | null>(null);
  const [confirmState, setConfirmState] = React.useState<ConfirmState>({ open: false });

  React.useEffect(() => {
    if (openStageId === null) return;
    if (stages.some((s) => s.id === openStageId)) return;
    setOpenStageId(null);
    setDraft(null);
    onBladeOpenChange?.(false);
  }, [stages, openStageId]);

  const updateStage = (index: number, patch: Partial<EnvironmentStage>) => {
    onChange(stages.map((stage, stageIndex) => (stageIndex === index ? { ...stage, ...patch } : stage)));
  };

  const openStage = (id: string) => {
    const found = stages.find((s) => s.id === id);
    if (found) {
      setDraft({ ...found });
      setOpenStageId(id);
      onBladeOpenChange?.(true);
    }
  };

  const closeBladeCancelling = () => {
    setDraft(null);
    setOpenStageId(null);
    onBladeOpenChange?.(false);
  };

  const saveAndCloseBlade = () => {
    if (draft) {
      const idx = stages.findIndex((s) => s.id === openStageId);
      if (idx >= 0) updateStage(idx, draft);
    }
    setDraft(null);
    setOpenStageId(null);
    onBladeOpenChange?.(false);
  };

  const addStage = () => {
    const stage = newStage();
    setDraft({ ...stage });
    setOpenStageId(stage.id);
    onChange([...stages, stage]);
    onBladeOpenChange?.(true);
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

  const activeIndex = stages.findIndex((s) => s.id === openStageId);

  React.useEffect(() => {
    if (!openStageId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDraft(null); setOpenStageId(null); onBladeOpenChange?.(false); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openStageId]);

  return (
    <>
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

      <div className="space-y-3">
        {stages.length === 0 ? (
          <div className={`${themeClasses.emptyState} rounded-3xl px-5 py-10 text-center`}>
            <div className="text-base font-medium text-[var(--text-primary)]">No stages yet</div>
            <p className={`${themeClasses.helperText} mt-2`}>
              Add a stage to start defining the Azure services used by this environment.
            </p>
          </div>
        ) : (
          stages.map((stage, index) => {
            const incompleteCount = stage.resourceActions.filter((ra) => isResourceIncomplete(ra)).length;
            const isActive = stage.id === openStageId;

            return (
              <article
                key={stage.id}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                className={`cursor-pointer rounded-3xl p-5 transition-all duration-200 ${
                  isActive
                    ? `${themeClasses.stageCardAccent} shadow-[0_18px_36px_color-mix(in_srgb,var(--accent-primary)_10%,transparent)]`
                    : `${themeClasses.stageCard} opacity-90`
                }`}
                onClick={() => { if (stage.id === openStageId) { closeBladeCancelling(); } else { openStage(stage.id); } }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { if (stage.id === openStageId) { closeBladeCancelling(); } else { openStage(stage.id); } }
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-subsection)] text-[var(--text-secondary)]">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <div>
                        <div className={themeClasses.sectionEyebrow}>Stage {index + 1}</div>
                        <div className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                          {stage.name?.trim() || <span className="italic text-[var(--text-secondary)]">Unnamed stage</span>}
                        </div>
                      </div>
                    </div>
                    <StageSummary stage={stage} />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {stage.resourceActions.length > 0 ? (
                        <>
                          {Array.from(new Set(stage.resourceActions.map((ra) => getResourceActionLabel(ra)))).map((label) => (
                            <span key={label} className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              {label}
                            </span>
                          ))}
                          {incompleteCount > 0 ? <WarningChip>{incompleteCount} incomplete</WarningChip> : null}
                        </>
                      ) : (
                        <EmptyServicesNotice compact />
                      )}
                    </div>
                  </div>
                  <button
                    aria-label="Remove stage"
                    className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                    onClick={(e) => { e.stopPropagation(); requestRemoveStage(stage, index); }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

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
    {draft !== null && activeIndex >= 0 ? createPortal(
      <aside
        className="stage-blade-enter w-full"
        aria-label={`Edit stage ${activeIndex + 1}`}
      >
        <div
          className={`${themeClasses.panel} flex flex-col overflow-hidden border-l border-[var(--border-subtle)] shadow-[-8px_0_32px_color-mix(in_srgb,var(--surface-app)_30%,transparent)]`}
          style={{
            position: 'sticky',
            top: 'calc(var(--topbar-height, 80px) + 16px)',
            height: 'calc(100vh - var(--topbar-height, 80px) - 32px)',
          }}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
            <div>
              <div className={themeClasses.sectionEyebrow}>Stage {activeIndex + 1}</div>
              <div className="mt-0.5 text-base font-semibold text-[var(--text-primary)]">
                {draft.name?.trim() || <span className="italic text-[var(--text-secondary)]">Unnamed stage</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              className={`${themeClasses.buttonSecondary} rounded-lg p-2`}
              onClick={closeBladeCancelling}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-5 px-6 py-5">
            <div>
              <label className={`block ${themeClasses.fieldLabel}`}>Stage name</label>
              <input
                aria-label="Stage name"
                autoFocus={draft.name === ''}
                placeholder="e.g. Staging, Pre-prod, Production…"
                className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                value={draft.name}
                onChange={(e) => setDraft((d) => d ? { ...d, name: e.target.value } : d)}
              />
            </div>
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
                <div className={themeClasses.sectionEyebrow}>Azure services</div>
              </div>
              <ResourceActionsEditor
                actions={draft.resourceActions || []}
                onChangeActions={(actions) => setDraft((d) => d ? { ...d, resourceActions: actions } : d)}
                msalInstance={msalInstance}
              />
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4">
            <div className={themeClasses.helperText}>Stage {activeIndex + 1} of {stages.length}</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${themeClasses.buttonSecondary} rounded-lg px-4 py-2 text-sm`}
                onClick={closeBladeCancelling}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${themeClasses.buttonPrimary} rounded-lg px-4 py-2 text-sm`}
                onClick={saveAndCloseBlade}
              >
                Save stage
              </button>
            </div>
          </div>
        </div>
      </aside>,
      document.getElementById('stage-blade-portal') ?? document.body
    ) : null}
    </>
  );
}

/**
 * Text input + browse button. `resetKey` controls when the loaded options are
 * discarded (e.g. pass the subscriptionId so the RG list clears when sub changes).
 */
function AzureLookupField({
  label,
  value,
  onChange,
  load,
  resetKey = '',
  placeholder,
  ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  load: (() => Promise<{ value: string; label: string }[]>) | null;
  resetKey?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [options, setOptions] = React.useState<{ value: string; label: string }[] | null>(null);
  const [browsing, setBrowsing] = React.useState(false);
  const [browseError, setBrowseError] = React.useState<string | null>(null);
  const [showSelect, setShowSelect] = React.useState(false);

  React.useEffect(() => {
    setOptions(null);
    setShowSelect(false);
    setBrowseError(null);
  }, [resetKey]);

  const browse = async () => {
    if (!load) return;
    setBrowsing(true);
    setBrowseError(null);
    try {
      const data = await load();
      setOptions(data);
      setShowSelect(true);
    } catch (err) {
      setBrowseError(err instanceof Error ? err.message : 'Failed to load Azure resources');
    } finally {
      setBrowsing(false);
    }
  };

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="mt-1 flex gap-2">
        {showSelect && options !== null ? (
          <select
            aria-label={ariaLabel || label}
            className={`${themeClasses.field} flex-1 rounded-lg px-3 py-2 text-sm`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            <option value="">Select…</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
            {value && !options.find((o) => o.value === value) ? (
              <option value={value}>{value}</option>
            ) : null}
          </select>
        ) : (
          <input
            aria-label={ariaLabel || label}
            placeholder={placeholder}
            className={`${themeClasses.field} flex-1 rounded-lg px-3 py-2 text-sm`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        <button
          type="button"
          aria-label={showSelect ? `Edit ${label} manually` : `Browse ${label}`}
          disabled={load === null || browsing}
          title={
            load === null
              ? 'Fill in the fields above first'
              : showSelect
              ? 'Switch to manual input'
              : 'Browse Azure resources'
          }
          className={`${themeClasses.buttonSecondary} inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg disabled:opacity-40`}
          onClick={showSelect ? () => setShowSelect(false) : browse}
        >
          {browsing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showSelect ? (
            <Pencil className="h-4 w-4" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </button>
      </div>
      {browseError ? (
        <div className="mt-1 text-xs text-red-400">{browseError}</div>
      ) : null}
    </div>
  );
}

function ResourceActionForm({
  item,
  onUpdate,
  msalInstance,
}: {
  item: any;
  onUpdate: (patch: Partial<any>) => void;
  msalInstance: IPublicClientApplication;
}) {
  const sub: string = item.subscriptionId || '';
  const rg: string = item.resourceGroup || '';
  const ws: string = item.workspaceName || '';
  const ns: string = item.namespace || '';

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="lg:col-span-2">
        <FieldLabel>Azure service type</FieldLabel>
        <select
          aria-label="Azure service type"
          className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
          value={item.type}
          onChange={(e) => onUpdate({ type: e.target.value })}
        >
          <option value="sql-vm">SQL VM</option>
          <option value="sql-managed-instance">SQL Managed Instance</option>
          <option value="synapse-sql-pool">Synapse SQL Pool</option>
          <option value="service-bus-message">Service Bus message</option>
          <option value="app-service">App Service (Web App)</option>
          <option value="container-instance">Container Instance (ACI)</option>
        </select>
      </div>

      <div className="lg:col-span-2">
        <AzureLookupField
          label="Subscription ID"
          value={sub}
          onChange={(v) =>
            onUpdate({ subscriptionId: v, resourceGroup: '', serverName: '', instanceName: '', workspaceName: '', sqlPoolName: '', namespace: '', queueOrTopic: '' })
          }
          load={() =>
            listAzureSubscriptions(msalInstance).then((subs) =>
              subs.map((s) => ({ value: s.subscriptionId, label: `${s.displayName} (${s.subscriptionId})` })),
            )
          }
        />
      </div>
      <div className="lg:col-span-2">
        <AzureLookupField
          label="Resource group"
          value={rg}
          resetKey={sub}
          onChange={(v) =>
            onUpdate({ resourceGroup: v, serverName: '', instanceName: '', workspaceName: '', sqlPoolName: '', namespace: '', queueOrTopic: '' })
          }
          load={
            sub
              ? () => listAzureResourceGroups(msalInstance, sub).then((rgs) => rgs.map((r) => ({ value: r.name, label: r.name })))
              : null
          }
        />
      </div>

      {item.type === 'sql-vm' ? (
        <div className="lg:col-span-2">
          <AzureLookupField
            label="Server name"
            value={item.serverName || ''}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ serverName: v })}
            load={
              sub && rg
                ? () => listAzureSqlVms(msalInstance, sub, rg).then((vms) => vms.map((vm) => ({ value: vm.name, label: vm.name })))
                : null
            }
          />
        </div>
      ) : null}

      {item.type === 'sql-managed-instance' ? (
        <div className="lg:col-span-2">
          <AzureLookupField
            label="Instance name"
            value={item.instanceName || ''}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ instanceName: v })}
            load={
              sub && rg
                ? () =>
                    listAzureSqlManagedInstances(msalInstance, sub, rg).then((mis) =>
                      mis.map((mi) => ({ value: mi.name, label: mi.name })),
                    )
                : null
            }
          />
        </div>
      ) : null}

      {item.type === 'synapse-sql-pool' ? (
        <>
          <AzureLookupField
            label="Workspace name"
            value={ws}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ workspaceName: v, sqlPoolName: '' })}
            load={
              sub && rg
                ? () =>
                    listAzureSynapseWorkspaces(msalInstance, sub, rg).then((wss) =>
                      wss.map((w) => ({ value: w.name, label: w.name })),
                    )
                : null
            }
          />
          <AzureLookupField
            label="SQL pool name"
            value={item.sqlPoolName || ''}
            resetKey={`${sub}|${rg}|${ws}`}
            onChange={(v) => onUpdate({ sqlPoolName: v })}
            load={
              sub && rg && ws
                ? () =>
                    listAzureSynapseSqlPools(msalInstance, sub, rg, ws).then((pools) =>
                      pools.map((p) => ({ value: p.name, label: p.name })),
                    )
                : null
            }
          />
        </>
      ) : null}

      {item.type === 'service-bus-message' ? (
        <>
          <AzureLookupField
            label="Service Bus namespace"
            ariaLabel="Service Bus namespace"
            value={ns}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ namespace: v, queueOrTopic: '' })}
            load={
              sub && rg
                ? () =>
                    listAzureServiceBusNamespaces(msalInstance, sub, rg).then((nss) =>
                      nss.map((n) => ({ value: n.shortName, label: n.name })),
                    )
                : null
            }
          />
          <div>
            <FieldLabel>Message type</FieldLabel>
            <select
              aria-label="Message type"
              className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
              value={item.messageType || ''}
              onChange={(e) => onUpdate({ messageType: e.target.value })}
            >
              <option value="">Any</option>
              <option value="queue">Queue</option>
              <option value="topic">Topic</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <AzureLookupField
              label="Service Bus entity name"
              ariaLabel="Service Bus entity name"
              value={item.queueOrTopic || ''}
              resetKey={`${sub}|${rg}|${ns}`}
              onChange={(v) => onUpdate({ queueOrTopic: v })}
              load={
                sub && rg && ns
                  ? () =>
                      listAzureServiceBusEntities(msalInstance, sub, rg, ns).then((entities) =>
                        entities
                          .filter((e) => !item.messageType || e.entityType === item.messageType)
                          .map((e) => ({ value: e.name, label: `${e.entityType}: ${e.name}` })),
                      )
                  : null
              }
            />
          </div>
        </>
      ) : null}

      {item.type === 'app-service' ? (
        <div className="lg:col-span-2">
          <AzureLookupField
            label="Site name"
            value={item.siteName || ''}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ siteName: v })}
            load={
              sub && rg
                ? () => listAzureWebApps(msalInstance, sub, rg).then((apps) => apps.map((a) => ({ value: a.name, label: a.name })))
                : null
            }
          />
        </div>
      ) : null}

      {item.type === 'container-instance' ? (
        <div className="lg:col-span-2">
          <AzureLookupField
            label="Container group name"
            value={item.containerGroupName || ''}
            resetKey={`${sub}|${rg}`}
            onChange={(v) => onUpdate({ containerGroupName: v })}
            load={
              sub && rg
                ? () => listAzureContainerGroups(msalInstance, sub, rg).then((g) => g.map((cg) => ({ value: cg.name, label: cg.name })))
                : null
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function ResourceActionsEditor({
  actions,
  onChangeActions,
  msalInstance,
}: {
  actions: any[];
  onChangeActions: (actions: any[]) => void;
  msalInstance: IPublicClientApplication;
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
            <div id={`azure-service-editor-${index}`}>
              <ResourceActionForm
                item={item}
                onUpdate={(patch) => update(index, patch)}
                msalInstance={msalInstance}
              />
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
