import { useCallback, useEffect, useMemo, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { enqueueSnackbar } from 'notistack';

import { EnvInstance, Schedule, createSchedule, listEnvironments, listSchedules, postponeSchedule } from '../api';
import { PageHeader } from '@/shared/ui/PageHeader';
import { themeClasses } from '@/theme/themeClasses';

type Props = { instance: IPublicClientApplication };

const emptySchedule = {
  action: 'start',
  cron: '0 8 * * 1-5',
  timezone: 'UTC',
  notifyBeforeMinutes: '30',
  postponeMinutes: '30',
  notificationGroupName: 'Operations',
  notificationRecipients: '',
  maxPostponements: '1',
};

const splitRecipients = (value: string) => value.split(',').map((v) => v.trim()).filter(Boolean);

export default function EnvironmentSchedulesManager({ instance: msalInstance }: Props) {
  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState(emptySchedule);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [envs, scheds] = await Promise.all([listEnvironments(msalInstance), listSchedules(msalInstance)]);
      const envList = Array.isArray(envs) ? envs : (envs?.environments ?? []);
      setInstances(envList);
      setSchedules(scheds);
      if (!selectedEnvId && envList[0]) {
        setSelectedEnvId(envList[0].id);
        setSelectedStageId(envList[0].stages[0]?.id ?? null);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load schedules.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance, selectedEnvId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectedEnv = useMemo(() => instances.find((item) => item.id === selectedEnvId) ?? instances[0] ?? null, [instances, selectedEnvId]);
  const selectedStage = useMemo(() => selectedEnv?.stages.find((item) => item.id === selectedStageId) ?? selectedEnv?.stages[0] ?? null, [selectedEnv, selectedStageId]);

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

  const createStageSchedule = async () => {
    if (!selectedEnv || !selectedStage) return;
    try {
      const created = await createSchedule(msalInstance, {
        environment: selectedEnv.name,
        client: selectedEnv.client,
        stage: selectedStage.name,
        action: scheduleForm.action,
        cron: scheduleForm.cron,
        timezone: scheduleForm.timezone,
        enabled: true,
        notify_before_minutes: Number(scheduleForm.notifyBeforeMinutes || 30),
        notification_groups: splitRecipients(scheduleForm.notificationRecipients).length ? [{ name: scheduleForm.notificationGroupName || 'Operations', recipients: splitRecipients(scheduleForm.notificationRecipients) }] : [],
        postponement_policy: { enabled: true, maxPostponeMinutes: Number(scheduleForm.postponeMinutes || 30), maxPostponements: Number(scheduleForm.maxPostponements || 1) },
      });
      setSchedules((state) => [created, ...state]);
      enqueueSnackbar('Schedule created', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to create schedule', { variant: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environment schedules"
        description="Create and maintain lifecycle schedules separately from the live environment dashboard."
        actions={<button className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`} onClick={() => void refresh()}>Refresh</button>}
      />

      {loadError ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">Failed to load schedules. {loadError}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <section className="ui-panel rounded-2xl p-4 xl:col-span-2">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">Target stage</h3>
          <div className="mt-4 space-y-3">
            {loading ? <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading stages...</div> : instances.map((environment) => (
              <div key={environment.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                <div className="font-medium text-[var(--text-primary)]">{environment.name}</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">{[environment.region, environment.client].filter(Boolean).join(' | ')}</div>
                <div className="mt-3 space-y-2">
                  {environment.stages.map((stage) => {
                    const active = selectedEnv?.id === environment.id && selectedStage?.id === stage.id;
                    return (
                      <button key={stage.id} onClick={() => { setSelectedEnvId(environment.id); setSelectedStageId(stage.id); }} className={['flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition', active ? 'border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'].join(' ')}>
                        <span className="font-medium text-[var(--text-primary)]">{stage.name}</span>
                        <span className="text-xs text-[var(--text-secondary)]">{stage.status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="ui-panel rounded-2xl p-4 xl:col-span-3">
          <h3 className="text-lg font-medium text-[var(--text-primary)]">{selectedStage ? `${selectedEnv?.name} / ${selectedStage.name}` : 'Create schedule'}</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--text-secondary)]">Action</span>
              <select className={`${themeClasses.select} rounded-lg px-3 py-2`} value={scheduleForm.action} onChange={(event) => setScheduleForm((state) => ({ ...state, action: event.target.value }))}>
                <option value="start">Start</option>
                <option value="stop">Stop</option>
              </select>
            </label>
            {[
              ['Cron', 'cron'],
              ['Timezone', 'timezone'],
              ['Notify before minutes', 'notifyBeforeMinutes'],
              ['Default postponement minutes', 'postponeMinutes'],
              ['Notification group', 'notificationGroupName'],
              ['Notification recipients', 'notificationRecipients'],
              ['Max postponements', 'maxPostponements'],
            ].map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--text-secondary)]">{label}</span>
                <input className={`${themeClasses.field} rounded-lg px-3 py-2`} value={(scheduleForm as Record<string, string>)[key]} onChange={(event) => setScheduleForm((state) => ({ ...state, [key]: event.target.value }))} />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button onClick={() => void createStageSchedule()} disabled={!selectedStage} className={`${themeClasses.buttonPrimary} rounded-lg px-4 py-2 text-sm disabled:opacity-60`}>Create schedule</button>
          </div>
        </section>
      </div>

      <section className="ui-panel rounded-2xl p-4">
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-medium text-[var(--text-primary)]">Existing schedules</h3><span className="text-xs ui-text-muted">{schedules.length} total</span></div>
        {loading ? <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading schedules...</div> : schedules.length === 0 ? <div className="rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-6 text-sm ui-text-muted">No schedules defined.</div> : <div className="space-y-3">{schedules.map((schedule) => <div key={schedule.id} className="rounded-2xl border border-[var(--border-subtle)] p-4"><div className="font-medium text-[var(--text-primary)]">{schedule.environment} / {schedule.client} / {schedule.stage}</div><div className="mt-1 text-sm text-[var(--text-secondary)]">{schedule.action} | {schedule.cron} | {schedule.timezone || 'UTC'}</div><div className="mt-1 text-xs ui-text-muted">Notify {schedule.notify_before_minutes ?? 30}m before{schedule.notification_groups?.length ? ` | ${schedule.notification_groups.map((group) => group.name).join(', ')}` : ''}</div>{schedule.postponed_until ? <div className="mt-1 text-xs text-[var(--accent-primary)]">Postponed until {new Date(schedule.postponed_until).toLocaleString()}</div> : null}<div className="mt-3 flex justify-end"><button onClick={() => void postponeSchedule(msalInstance, schedule.id, { postponeByMinutes: Number(scheduleForm.postponeMinutes || 30), reason: 'Postponed from environments schedule UI' }).then((updated) => setSchedules((state) => state.map((item) => item.id === updated.id ? updated : item))).then(() => enqueueSnackbar('Schedule postponed', { variant: 'success' })).catch(() => enqueueSnackbar('Failed to postpone schedule', { variant: 'error' }))} className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}>Postpone {scheduleForm.postponeMinutes || '30'}m</button></div></div>)}</div>}
      </section>
    </div>
  );
}
