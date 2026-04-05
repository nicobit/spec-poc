import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { CalendarClock, Clock3, Mail, ShieldAlert } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import { type EnvInstance, createSchedule, listEnvironments } from '../api';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import {
  DEFAULT_SCHEDULE_BUILDER,
  type DayOfWeek,
  cronFromBuilder,
  describeSchedule,
} from '../scheduleRecurrence';
import { themeClasses } from '@/theme/themeClasses';

const emptySchedule = {
  action: 'start',
  timezone: 'UTC',
  notifyBeforeMinutes: '30',
  postponeMinutes: '30',
  notificationGroupName: 'Operations',
  notificationRecipients: '',
  maxPostponements: '1',
};

const dayOptions: { value: DayOfWeek; label: string }[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];

const splitRecipients = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const getClientKey = (environment: EnvInstance) => environment.clientId || environment.client || '';
const getClientLabel = (environment: EnvInstance) => environment.client || environment.clientId || 'Unassigned client';

export default function EnvironmentScheduleCreatePage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedRef = useRef(false);

  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);
  const [scheduleBuilder, setScheduleBuilder] = useState(DEFAULT_SCHEDULE_BUILDER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const environments = await listEnvironments(instance);
        const envList = Array.isArray(environments) ? environments : environments?.environments ?? [];
        if (!mounted) return;
        setInstances(envList);
      } catch (error) {
        if (!mounted) return;
        setLoadError(error instanceof Error ? error.message : 'Failed to load schedule context.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [instance]);

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
    if (!selectedStage) return;
    const group = selectedStage.notificationGroups?.[0];
    setScheduleForm((state) => ({
      ...state,
      notificationGroupName: group?.name || 'Operations',
      notificationRecipients: group?.recipients?.join(', ') || '',
      maxPostponements: String(selectedStage.postponementPolicy?.maxPostponements ?? 1),
      postponeMinutes: String(selectedStage.postponementPolicy?.maxPostponeMinutes ?? 30),
    }));
  }, [selectedStage]);

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

  const schedulePreview = useMemo(() => {
    const cron = cronFromBuilder(scheduleBuilder);
    return describeSchedule(scheduleForm.action, cron, scheduleForm.timezone);
  }, [scheduleBuilder, scheduleForm.action, scheduleForm.timezone]);

  const handleCancel = () => {
    navigate(
      `/environment/schedules?clientId=${encodeURIComponent(selectedClient || '')}&environmentId=${encodeURIComponent(
        selectedEnv?.id || '',
      )}&stageId=${encodeURIComponent(selectedStage?.id || '')}`,
    );
  };

  const handleSubmit = async () => {
    if (!selectedEnv || !selectedStage) return;
    const cron = cronFromBuilder(scheduleBuilder);
    if (!cron) {
      enqueueSnackbar('Please complete the day pattern and time for this schedule.', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      await createSchedule(instance, {
        environment_id: selectedEnv.id,
        environment: selectedEnv.name,
        client: selectedEnv.client,
        client_id: selectedEnv.clientId,
        stage_id: selectedStage.id,
        stage: selectedStage.name,
        action: scheduleForm.action,
        cron,
        timezone: scheduleForm.timezone,
        enabled: true,
        notify_before_minutes: Number(scheduleForm.notifyBeforeMinutes || 30),
        notification_groups: splitRecipients(scheduleForm.notificationRecipients).length
          ? [
              {
                name: scheduleForm.notificationGroupName || 'Operations',
                recipients: splitRecipients(scheduleForm.notificationRecipients),
              },
            ]
          : [],
        postponement_policy: {
          enabled: true,
          maxPostponeMinutes: Number(scheduleForm.postponeMinutes || 30),
          maxPostponements: Number(scheduleForm.maxPostponements || 1),
        },
      });
      enqueueSnackbar('Schedule created', { variant: 'success' });
      handleCancel();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to create schedule', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnvironmentPageLayout
      title="Create schedule"
      description="Define timing, notifications, and postponement for a selected stage."
    >
      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load schedule context. {loadError}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              <div className={themeClasses.sectionEyebrow}>Status</div>
              <div className="mt-2 text-lg font-semibold capitalize text-[var(--text-primary)]">{selectedStage.status}</div>
              <div className={`${themeClasses.helperText} mt-1`}>{getClientLabel(selectedEnv)}</div>
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
        <div className="space-y-5">
          <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
              <div className={themeClasses.fieldLabel}>Timing</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Action</span>
                <select
                  className={`${themeClasses.select} rounded-lg px-3 py-2`}
                  value={scheduleForm.action}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, action: event.target.value }))}
                >
                  <option value="start">Start</option>
                  <option value="stop">Stop</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Day pattern</span>
                <select
                  className={`${themeClasses.select} rounded-lg px-3 py-2`}
                  value={scheduleBuilder.pattern}
                  onChange={(event) =>
                    setScheduleBuilder((state) => ({
                      ...state,
                      pattern: event.target.value as typeof state.pattern,
                    }))
                  }
                >
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="selected-days">Selected day(s)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Time</span>
                <input
                  type="time"
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleBuilder.time}
                  onChange={(event) => setScheduleBuilder((state) => ({ ...state, time: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Timezone</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.timezone}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, timezone: event.target.value }))}
                />
              </label>
            </div>

            {scheduleBuilder.pattern === 'selected-days' ? (
              <div className="mt-4">
                <span className={`${themeClasses.fieldLabel} block`}>Days of week</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dayOptions.map((day) => {
                    const selected = scheduleBuilder.daysOfWeek.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                          selected ? themeClasses.buttonPrimary : themeClasses.buttonSecondary
                        }`}
                        onClick={() =>
                          setScheduleBuilder((state) => ({
                            ...state,
                            daysOfWeek: state.daysOfWeek.includes(day.value)
                              ? state.daysOfWeek.filter((entry) => entry !== day.value)
                              : [...state.daysOfWeek, day.value],
                          }))
                        }
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className={`${themeClasses.emptyState} mt-4 rounded-2xl px-4 py-4 text-sm`}>
              <div className="font-medium text-[var(--text-primary)]">Schedule preview</div>
              <div className={`${themeClasses.helperText} mt-1`}>{schedulePreview}</div>
            </div>
          </div>

          <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
            <div className="mb-4 flex items-center gap-2">
              <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
              <div className={themeClasses.fieldLabel}>Notifications</div>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Notify before minutes</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.notifyBeforeMinutes}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, notifyBeforeMinutes: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Notification group</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.notificationGroupName}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, notificationGroupName: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm lg:col-span-3">
                <span className={themeClasses.fieldLabel}>Recipients</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.notificationRecipients}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, notificationRecipients: event.target.value }))}
                  placeholder="name@company.com, other@company.com"
                />
              </label>
            </div>
          </div>

          <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
            <div className="mb-4 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[var(--text-secondary)]" />
              <div className={themeClasses.fieldLabel}>Postponement</div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Default postponement minutes</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.postponeMinutes}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, postponeMinutes: event.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className={themeClasses.fieldLabel}>Max postponements</span>
                <input
                  className={`${themeClasses.field} rounded-lg px-3 py-2`}
                  value={scheduleForm.maxPostponements}
                  onChange={(event) => setScheduleForm((state) => ({ ...state, maxPostponements: event.target.value }))}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={`${themeClasses.buttonSecondary} rounded-lg px-4 py-2 text-sm`}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!selectedStage || saving || loading}
              className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm disabled:opacity-60`}
            >
              <CalendarClock className="h-4 w-4" />
              {saving ? 'Creating...' : 'Create schedule'}
            </button>
          </div>
        </div>
      </section>
    </EnvironmentPageLayout>
  );
}
