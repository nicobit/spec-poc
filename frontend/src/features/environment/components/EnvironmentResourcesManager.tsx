import { useCallback, useEffect, useMemo, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { enqueueSnackbar } from 'notistack';

import { EnvInstance, listEnvironments, updateStageConfiguration } from '../api';
import { PageHeader } from '@/shared/ui/PageHeader';
import { themeClasses } from '@/theme/themeClasses';

type Props = { instance: IPublicClientApplication };

const emptyConfig = {
  subscriptionId: '',
  resourceGroup: '',
  sqlVmName: '',
  sqlManagedInstanceName: '',
  synapseWorkspaceName: '',
  synapseSqlPoolName: '',
  serviceBusNamespace: '',
  serviceBusQueueOrTopic: '',
  serviceBusMessageType: '',
  notificationGroupName: 'Operations',
  notificationRecipients: '',
  maxPostponeMinutes: '60',
  maxPostponements: '1',
};

const splitRecipients = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

export default function EnvironmentResourcesManager({ instance: msalInstance }: Props) {
  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState(emptyConfig);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const envs = await listEnvironments(msalInstance);
      const envList = Array.isArray(envs) ? envs : (envs?.environments ?? []);
      setInstances(envList);
      if (!selectedEnvId && envList[0]) {
        setSelectedEnvId(envList[0].id);
        setSelectedStageId(envList[0].stages[0]?.id ?? null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load environment resources.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance, selectedEnvId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedEnv = useMemo(
    () => instances.find((item) => item.id === selectedEnvId) ?? instances[0] ?? null,
    [instances, selectedEnvId],
  );
  const selectedStage = useMemo(
    () => selectedEnv?.stages.find((item) => item.id === selectedStageId) ?? selectedEnv?.stages[0] ?? null,
    [selectedEnv, selectedStageId],
  );

  useEffect(() => {
    if (!selectedStage) return;
    const sqlVm = selectedStage.resourceActions.find((item) => item.type === 'sql-vm');
    const sqlMi = selectedStage.resourceActions.find((item) => item.type === 'sql-managed-instance');
    const synapse = selectedStage.resourceActions.find((item) => item.type === 'synapse-sql-pool');
    const serviceBus = selectedStage.resourceActions.find((item) => item.type === 'service-bus-message');
    const group = selectedStage.notificationGroups?.[0];
    setConfigForm({
      subscriptionId: sqlVm?.subscriptionId || sqlMi?.subscriptionId || synapse?.subscriptionId || '',
      resourceGroup: sqlVm?.resourceGroup || sqlMi?.resourceGroup || '',
      sqlVmName: sqlVm?.serverName || '',
      sqlManagedInstanceName: sqlMi?.instanceName || '',
      synapseWorkspaceName: synapse?.workspaceName || '',
      synapseSqlPoolName: synapse?.sqlPoolName || '',
      serviceBusNamespace: serviceBus?.namespace || '',
      serviceBusQueueOrTopic: serviceBus?.queueOrTopic || '',
      serviceBusMessageType: serviceBus?.messageType || '',
      notificationGroupName: group?.name || 'Operations',
      notificationRecipients: group?.recipients?.join(', ') || '',
      maxPostponeMinutes: String(selectedStage.postponementPolicy?.maxPostponeMinutes ?? 60),
      maxPostponements: String(selectedStage.postponementPolicy?.maxPostponements ?? 1),
    });
  }, [selectedStage]);

  const saveConfiguration = async () => {
    if (!selectedEnv || !selectedStage) return;
    const resourceActions: Parameters<typeof updateStageConfiguration>[3]['resourceActions'] = [];
    if (configForm.sqlVmName) {
      resourceActions.push({ type: 'sql-vm', subscriptionId: configForm.subscriptionId || undefined, resourceGroup: configForm.resourceGroup || undefined, serverName: configForm.sqlVmName });
    }
    if (configForm.sqlManagedInstanceName) {
      resourceActions.push({ type: 'sql-managed-instance', subscriptionId: configForm.subscriptionId || undefined, resourceGroup: configForm.resourceGroup || undefined, instanceName: configForm.sqlManagedInstanceName });
    }
    if (configForm.synapseWorkspaceName || configForm.synapseSqlPoolName) {
      resourceActions.push({ type: 'synapse-sql-pool', subscriptionId: configForm.subscriptionId || undefined, workspaceName: configForm.synapseWorkspaceName || undefined, sqlPoolName: configForm.synapseSqlPoolName || undefined });
    }
    if (configForm.serviceBusNamespace || configForm.serviceBusQueueOrTopic || configForm.serviceBusMessageType) {
      resourceActions.push({ type: 'service-bus-message', namespace: configForm.serviceBusNamespace || undefined, queueOrTopic: configForm.serviceBusQueueOrTopic || undefined, messageType: configForm.serviceBusMessageType || undefined });
    }
    const notificationGroups = splitRecipients(configForm.notificationRecipients).length
      ? [{ name: configForm.notificationGroupName || 'Operations', recipients: splitRecipients(configForm.notificationRecipients) }]
      : [];

    try {
      await updateStageConfiguration(msalInstance, selectedEnv.id, selectedStage.id, {
        resourceActions,
        notificationGroups,
        postponementPolicy: {
          enabled: true,
          maxPostponeMinutes: Number(configForm.maxPostponeMinutes || 0),
          maxPostponements: Number(configForm.maxPostponements || 0),
        },
      });
      await refresh();
      enqueueSnackbar('Stage configuration saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save stage configuration', { variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environment resources"
        description="Manage the Azure services, recipients, and postponement rules that each environment stage depends on."
        actions={<button className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`} onClick={() => void refresh()}>Refresh</button>}
      />

      {loadError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">Failed to load environment resources. {loadError}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="ui-panel rounded-2xl p-4 xl:col-span-2">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Stages</h3>
          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading environments...</div>
            ) : (
              instances.map((environment) => (
                <div key={environment.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                  <div className="font-medium text-[var(--text-primary)]">{environment.name}</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">{[environment.region, environment.client].filter(Boolean).join(' | ')}</div>
                  <div className="mt-3 space-y-2">
                    {environment.stages.map((stage) => {
                      const active = selectedEnv?.id === environment.id && selectedStage?.id === stage.id;
                      return (
                        <button
                          key={stage.id}
                          onClick={() => {
                            setSelectedEnvId(environment.id);
                            setSelectedStageId(stage.id);
                          }}
                          className={[
                            'flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition',
                            active ? 'border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
                          ].join(' ')}
                        >
                          <span className="font-medium text-[var(--text-primary)]">{stage.name}</span>
                          <span className="text-xs text-[var(--text-secondary)]">{stage.status}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="ui-panel rounded-2xl p-4 xl:col-span-3">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{selectedStage ? `${selectedEnv?.name} / ${selectedStage.name}` : 'Stage configuration'}</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              ['Subscription ID', 'subscriptionId'],
              ['Resource group', 'resourceGroup'],
              ['SQL VM', 'sqlVmName'],
              ['SQL Managed Instance', 'sqlManagedInstanceName'],
              ['Synapse workspace', 'synapseWorkspaceName'],
              ['Synapse SQL pool', 'synapseSqlPoolName'],
              ['Service Bus namespace', 'serviceBusNamespace'],
              ['Queue or topic', 'serviceBusQueueOrTopic'],
              ['Message type', 'serviceBusMessageType'],
              ['Notification group', 'notificationGroupName'],
              ['Recipients', 'notificationRecipients'],
              ['Max postpone minutes', 'maxPostponeMinutes'],
              ['Max postponements', 'maxPostponements'],
            ].map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <input className={`${themeClasses.field} rounded-lg px-3 py-2`} value={(configForm as Record<string, string>)[key]} onChange={(event) => setConfigForm((state) => ({ ...state, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => void saveConfiguration()} disabled={!selectedStage} className={`${themeClasses.buttonPrimary} rounded-lg px-4 py-2 text-sm disabled:opacity-60`}>Save stage configuration</button>
          </div>
        </section>
      </div>
    </div>
  );
}
