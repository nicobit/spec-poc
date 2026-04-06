import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { AlertTriangle, CalendarClock, CheckCircle2, Loader2, Plus, XCircle, Edit3, Trash2 } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { type EnvInstance, type Schedule, type StageExecution, getEnvironment, listEnvironments, listSchedules, postponeSchedule, deleteSchedule } from '../api';
import { themeClasses } from '@/theme/themeClasses';
import { describeSchedule } from '../scheduleRecurrence';

const getClientKey = (environment: EnvInstance) => environment.clientId || environment.client || '';
const getClientLabel = (environment: EnvInstance) => environment.client || environment.clientId || 'Unassigned client';

type Props = {
  instance: IPublicClientApplication;
  refreshKey?: number;
  onLoadingChange?: (loading: boolean) => void;
};

export default function EnvironmentSchedulesManager({ instance: msalInstance, refreshKey = 0, onLoadingChange }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedRef = useRef(false);

  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedEnvDetails, setSelectedEnvDetails] = useState<EnvInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [environmentsResponse, schedulesResponse] = await Promise.all([
        listEnvironments(msalInstance),
        listSchedules(msalInstance),
      ]);
      const envList = Array.isArray(environmentsResponse)
        ? environmentsResponse
        : environmentsResponse?.environments ?? [];
      setInstances(envList);
      setSchedules(schedulesResponse);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (refreshKey > 0) {
      void refresh();
    }
  }, [refresh, refreshKey]);

  const clientOptions = useMemo(() => {
    const unique = new Map<string, string>();
    instances.forEach((item) => {
      const key = getClientKey(item);
      const label = getClientLabel(item);
      if (key && !unique.has(key)) unique.set(key, label);
    });
    return Array.from(unique.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [instances]);

  const environmentsForClient = useMemo(() => {
    if (!selectedClient) return instances;
    const filtered = instances.filter((item) => getClientKey(item) === selectedClient);
    return filtered.slice().sort((a, b) => {
      const ad = (a as any).displayOrder;
      const bd = (b as any).displayOrder;
      const aIsNone = ad === undefined || ad === null;
      const bIsNone = bd === undefined || bd === null;
      if (aIsNone && bIsNone) return a.name.localeCompare(b.name);
      if (aIsNone) return 1;
      if (bIsNone) return -1;
      const an = Number(ad);
      const bn = Number(bd);
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        if (an !== bn) return an - bn;
      }
      return a.name.localeCompare(b.name);
    });
  }, [instances, selectedClient]);

  const selectedEnv = useMemo(
    () => environmentsForClient.find((item) => item.id === selectedEnvId) ?? environmentsForClient[0] ?? null,
    [environmentsForClient, selectedEnvId],
  );

  const selectedStage = useMemo(
    () => selectedEnv?.stages.find((item) => item.id === selectedStageId) ?? selectedEnv?.stages[0] ?? null,
    [selectedEnv, selectedStageId],
  );

  const selectedDetailedStage = useMemo(
    () => selectedEnvDetails?.stages?.find((item) => item.id === selectedStage?.id) ?? selectedStage ?? null,
    [selectedEnvDetails, selectedStage],
  );

  const stageSchedules = useMemo(() => {
    const sourceSchedules = selectedEnvDetails?.schedules || schedules;
    if (!selectedEnv || !selectedStage) return [];
    return sourceSchedules.filter(
      (schedule) =>
        (schedule.environment_id ? schedule.environment_id === selectedEnv.id : schedule.environment === selectedEnv.name) &&
        (schedule.stage_id ? schedule.stage_id === selectedStage.id : schedule.stage === selectedStage.name),
    );
  }, [selectedEnvDetails?.schedules, schedules, selectedEnv, selectedStage]);

  useEffect(() => {
    if (!selectedEnv?.id) {
      setSelectedEnvDetails(null);
      return;
    }
    let mounted = true;
    void (async () => {
      try {
        const details = await getEnvironment(msalInstance, selectedEnv.id);
        if (!mounted) return;
        setSelectedEnvDetails(details);
      } catch {
        if (!mounted) return;
        setSelectedEnvDetails(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [msalInstance, selectedEnv?.id]);

  useEffect(() => {
    if (!instances.length || initializedRef.current) return;

    const clientFromQuery = searchParams.get('clientId') || searchParams.get('client');
    const envIdFromQuery = searchParams.get('environmentId');
    const stageIdFromQuery = searchParams.get('stageId');

    const initialClient =
      (clientFromQuery && clientOptions.some((option) => option.value === clientFromQuery) ? clientFromQuery : null) ??
      getClientKey(instances[0]!) ??
      null;
    const clientEnvironments = initialClient
      ? instances
          .filter((item) => getClientKey(item) === initialClient)
          .slice()
          .sort((a, b) => {
            const ad = (a as any).displayOrder;
            const bd = (b as any).displayOrder;
            const aIsNone = ad === undefined || ad === null;
            const bIsNone = bd === undefined || bd === null;
            if (aIsNone && bIsNone) return a.name.localeCompare(b.name);
            if (aIsNone) return 1;
            if (bIsNone) return -1;
            const an = Number(ad);
            const bn = Number(bd);
            if (!Number.isNaN(an) && !Number.isNaN(bn)) {
              if (an !== bn) return an - bn;
            }
            return a.name.localeCompare(b.name);
          })
      : instances;
    const initialEnvironment =
      (envIdFromQuery ? clientEnvironments.find((item) => item.id === envIdFromQuery) : null) ??
      clientEnvironments[0] ??
      null;
    const initialStage =
      (stageIdFromQuery ? initialEnvironment?.stages.find((item) => item.id === stageIdFromQuery) : null) ??
      initialEnvironment?.stages[0] ??
      null;

    setSelectedClient(initialClient);
    setSelectedEnvId(initialEnvironment?.id ?? null);
    setSelectedStageId(initialStage?.id ?? null);
    initializedRef.current = true;
  }, [clientOptions, instances, searchParams]);

  useEffect(() => {
    if (!selectedClient) return;
    if (selectedEnv && getClientKey(selectedEnv) === selectedClient) return;

    const nextEnvironment = environmentsForClient[0] ?? null;
    setSelectedEnvId(nextEnvironment?.id ?? null);
    setSelectedStageId(nextEnvironment?.stages[0]?.id ?? null);
  }, [environmentsForClient, selectedClient, selectedEnv]);

  useEffect(() => {
    if (!selectedEnv) return;
    if (selectedStage && selectedEnv.stages.some((item) => item.id === selectedStage.id)) return;
    setSelectedStageId(selectedEnv.stages[0]?.id ?? null);
  }, [selectedEnv, selectedStage]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClient) params.set('clientId', selectedClient);
    if (selectedEnv?.id) params.set('environmentId', selectedEnv.id);
    if (selectedStage?.id) params.set('stageId', selectedStage.id);
    setSearchParams(params, { replace: true });
  }, [selectedClient, selectedEnv, selectedStage, setSearchParams]);

  const recipientCount = (selectedStage?.notificationGroups || []).reduce(
    (count, group) => count + (group.recipients?.length || 0),
    0,
  );
  const scheduleCountLabel = `${stageSchedules.length} schedule${stageSchedules.length === 1 ? '' : 's'}`;
  const defaultPostponeMinutes = selectedStage?.postponementPolicy?.maxPostponeMinutes ?? 30;
  const createHref = `/environment/schedules/create?clientId=${encodeURIComponent(selectedClient || '')}&environmentId=${encodeURIComponent(
    selectedEnv?.id || '',
  )}&stageId=${encodeURIComponent(selectedStage?.id || '')}`;

  function formatTimestamp(value?: string | null) {
    if (!value) return 'n/a';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function getExecutionStatusTone(status?: StageExecution['status'] | null) {
    switch (status) {
      case 'succeeded':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
      case 'failed':
        return 'border-red-500/30 bg-red-500/10 text-red-300';
      case 'partially_failed':
        return themeClasses.warningChip;
      case 'in_progress':
      case 'pending':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
      default:
        return 'border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] text-[var(--text-secondary)]';
    }
  }

  function getExecutionStatusIcon(status?: StageExecution['status'] | null) {
    switch (status) {
      case 'succeeded':
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case 'failed':
        return <XCircle className="h-3.5 w-3.5" />;
      case 'partially_failed':
        return <AlertTriangle className="h-3.5 w-3.5" />;
      case 'in_progress':
      case 'pending':
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load schedules. {loadError}
        </div>
      ) : null}

      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <div className="grid gap-3 xl:grid-cols-[1.1fr_1.1fr_0.8fr]">
          <label className="flex flex-col gap-1 text-sm">
            <span className={themeClasses.fieldLabel}>Client</span>
            <select
              className={`${themeClasses.select} rounded-lg px-3 py-2`}
              value={selectedClient || ''}
              onChange={(event) => setSelectedClient(event.target.value || null)}
            >
              {clientOptions.map((client) => (
                <option key={client.value} value={client.value}>
                  {client.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className={themeClasses.fieldLabel}>Environment</span>
            <select
              className={`${themeClasses.select} rounded-lg px-3 py-2`}
              value={selectedEnv?.id || ''}
              onChange={(event) => {
                const environmentId = event.target.value || null;
                const environment = environmentsForClient.find((item) => item.id === environmentId) ?? null;
                setSelectedEnvId(environmentId);
                setSelectedStageId(environment?.stages[0]?.id ?? null);
              }}
            >
              {environmentsForClient.map((environment) => (
                <option key={environment.id} value={environment.id}>
                  {environment.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className={themeClasses.fieldLabel}>Stage</span>
            <select
              className={`${themeClasses.select} rounded-lg px-3 py-2`}
              value={selectedStage?.id || ''}
              onChange={(event) => setSelectedStageId(event.target.value || null)}
            >
              {(selectedEnv?.stages || []).map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedEnv && selectedStage ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
              <div className={themeClasses.sectionEyebrow}>Selected stage</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{selectedStage.name}</div>
              <div className={`${themeClasses.helperText} mt-1`}>{selectedEnv.name}</div>
            </div>
            <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
              <div className={themeClasses.sectionEyebrow}>Latest execution</div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getExecutionStatusTone(
                    selectedDetailedStage?.latestExecution?.status,
                  )}`}
                >
                  {getExecutionStatusIcon(selectedDetailedStage?.latestExecution?.status)}
                  {selectedDetailedStage?.latestExecution
                    ? selectedDetailedStage.latestExecution.status.replace(/_/g, ' ')
                    : 'No execution yet'}
                </span>
              </div>
              <div className={`${themeClasses.helperText} mt-1`}>
                {selectedDetailedStage?.latestExecution
                  ? formatTimestamp(
                      selectedDetailedStage.latestExecution.completedAt ||
                        selectedDetailedStage.latestExecution.startedAt ||
                        selectedDetailedStage.latestExecution.requestedAt,
                    )
                  : scheduleCountLabel}
              </div>
            </div>
            <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
              <div className={themeClasses.sectionEyebrow}>Azure services</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{selectedStage.resourceActions.length}</div>
              <div className={`${themeClasses.helperText} mt-1`}>Configured for this stage</div>
            </div>
            <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
              <div className={themeClasses.sectionEyebrow}>Recipients</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{recipientCount}</div>
              <div className={`${themeClasses.helperText} mt-1`}>Current notification targets</div>
            </div>
          </div>
        ) : null}
      </section>

      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Schedules for the selected stage</h3>
            <p className={`${themeClasses.helperText} mt-1`}>
              Review automatic runs for this stage, then create or adjust schedules from a focused workflow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              {scheduleCountLabel}
            </span>
            <button
              type="button"
              onClick={() => navigate(createHref)}
              className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm`}
            >
              <Plus className="h-4 w-4" />
              New schedule
            </button>
          </div>
        </div>

        <div className="mt-4">
          {!loading && stageSchedules.length === 0 ? (
            <div className={`${themeClasses.emptyState} rounded-2xl px-4 py-10 text-center`}>
              <div className="text-sm">No schedules configured for this stage yet.</div>
              <button
                type="button"
                onClick={() => navigate(createHref)}
                className={`${themeClasses.buttonPrimary} mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm`}
              >
                <CalendarClock className="h-4 w-4" />
                Create first schedule
              </button>
            </div>
          ) : stageSchedules.length > 0 ? (
            <div className="space-y-3">
              {stageSchedules.map((schedule) => (
                <div key={schedule.id} className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs capitalize text-[var(--text-secondary)]">
                          {schedule.action}
                        </span>
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {schedule.enabled === false ? 'Disabled' : 'Enabled'}
                        </span>
                      </div>
                      <div className={`mt-3 grid gap-2 md:grid-cols-2 ${themeClasses.helperText}`}>
                        <div>Schedule: {describeSchedule(schedule.action, schedule.cron, schedule.timezone)}</div>
                        <div>Timezone: {schedule.timezone || 'UTC'}</div>
                        <div>Notify before: {schedule.notify_before_minutes ?? 30} minutes</div>
                        <div>
                          Recipients:{' '}
                          {schedule.notification_groups?.length
                            ? schedule.notification_groups.map((group) => group.name).join(', ')
                            : 'None'}
                        </div>
                        <div>
                          Postponement:{' '}
                          {schedule.postponement_policy?.enabled === false
                            ? 'Disabled'
                            : `${schedule.postponement_policy?.maxPostponeMinutes ?? 30} min, ${schedule.postponement_policy?.maxPostponements ?? 1} max`}
                        </div>
                        <div>Next run: {schedule.next_run ? new Date(schedule.next_run).toLocaleString() : 'n/a'}</div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getExecutionStatusTone(
                            schedule.latestExecution?.status,
                          )}`}
                        >
                          {getExecutionStatusIcon(schedule.latestExecution?.status)}
                          {schedule.latestExecution ? schedule.latestExecution.status.replace(/_/g, ' ') : 'No execution yet'}
                        </span>
                        {schedule.executionCount ? (
                          <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                            {schedule.executionCount} execution{schedule.executionCount === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>
                      {schedule.latestExecution ? (
                        <div className={`${themeClasses.helperText} mt-2`}>
                          Last execution:{' '}
                          {formatTimestamp(
                            schedule.latestExecution.completedAt ||
                              schedule.latestExecution.startedAt ||
                              schedule.latestExecution.requestedAt,
                          )}
                          {schedule.latestExecution.message ? ` · ${schedule.latestExecution.message}` : ''}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          void postponeSchedule(msalInstance, schedule.id, {
                            postponeByMinutes: defaultPostponeMinutes,
                            reason: 'Postponed from environment schedules UI',
                          })
                            .then((updated) =>
                              setSchedules((current) => current.map((item) => (item.id === updated.id ? updated : item))),
                            )
                            .then(() => enqueueSnackbar('Schedule postponed', { variant: 'success' }))
                            .catch(() => enqueueSnackbar('Failed to postpone schedule', { variant: 'error' }))
                        }
                        className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                      >
                        <CalendarClock className="h-4 w-4" />
                        Postpone {defaultPostponeMinutes}m
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/environment/schedules/create?clientId=${encodeURIComponent(
                              selectedClient || '',
                            )}&environmentId=${encodeURIComponent(selectedEnv?.id || '')}&stageId=${encodeURIComponent(
                              selectedStage?.id || '',
                            )}&scheduleId=${encodeURIComponent(schedule.id)}`,
                          )
                        }
                        className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(schedule.id)}
                        className={`${themeClasses.buttonDanger} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

        {deleteConfirmId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirmId(null)} />
            <div className="relative z-10 w-full max-w-md rounded-2xl bg-[var(--surface-panel)] p-6">
              <div className="text-lg font-semibold">Delete schedule?</div>
              <div className="mt-2 text-sm text-[var(--text-secondary)]">This will permanently delete the schedule. Are you sure?</div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!deleteConfirmId) return;
                    try {
                      setDeleting(true);
                      await deleteSchedule(msalInstance, deleteConfirmId);
                      setSchedules((current) => current.filter((s) => s.id !== deleteConfirmId));
                      enqueueSnackbar('Schedule deleted', { variant: 'success' });
                    } catch (err) {
                      enqueueSnackbar('Failed to delete schedule', { variant: 'error' });
                    } finally {
                      setDeleting(false);
                      setDeleteConfirmId(null);
                    }
                  }}
                  disabled={deleting}
                  className={`${themeClasses.buttonDanger} rounded-lg px-3 py-1.5 text-sm`}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
    </div>
  );
}
