import { useCallback, useEffect, useMemo, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, Clock3, ExternalLink, RefreshCw, Server, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuthZ } from '@/auth/useAuthZ';
import { PageHeader, PageStatCard } from '@/shared/ui/PageHeader';
import { themeClasses } from '@/theme/themeClasses';

import { type EnvInstance, type ResourceAction, type Schedule, type StageExecution, getEnvironment, listEnvironments, listSchedules } from '../api';

type Props = { instance: IPublicClientApplication };

type DashboardEnvironment = EnvInstance;

const STAGE_ACTION_PROPERTY_MAP: Record<string, string[]> = {
  'sql-vm': ['subscriptionId', 'resourceGroup', 'region', 'properties.vmName'],
  'sql-managed-instance': ['subscriptionId', 'resourceGroup', 'region', 'properties.managedInstanceName'],
  'synapse-sql-pool': ['subscriptionId', 'resourceGroup', 'region', 'properties.workspaceName', 'properties.sqlPoolName'],
  'service-bus-message': ['subscriptionId', 'resourceGroup', 'region', 'properties.namespace', 'properties.entityType', 'properties.entityName', 'properties.messageTemplate'],
};

function getValueAtPath(action: ResourceAction, path: string) {
  return path.split('.').reduce<any>((current, segment) => (current && typeof current === 'object' ? current[segment as keyof typeof current] : undefined), action as any);
}

function isResourceActionIncomplete(action: ResourceAction) {
  const requiredPaths = STAGE_ACTION_PROPERTY_MAP[action.type] ?? [];
  return requiredPaths.some((path) => {
    const value = getValueAtPath(action, path);
    return value === undefined || value === null || String(value).trim() === '';
  });
}

function getStageIncompleteCount(environment: DashboardEnvironment) {
  return environment.stages.reduce((count, stage) => count + stage.resourceActions.filter(isResourceActionIncomplete).length, 0);
}

function flattenExecutions(environments: DashboardEnvironment[]) {
  return environments.flatMap((environment) =>
    environment.stages.flatMap((stage) =>
      (stage.executions ?? []).map((execution) => ({
        environment,
        stage,
        execution,
      })),
    ),
  );
}

function sortByRequestedAtDescending<T extends { execution?: StageExecution; next_run?: string | null }>(items: T[]) {
  return items.slice().sort((left, right) => {
    const leftValue = new Date((left as any).execution?.requestedAt ?? (left as any).next_run ?? 0).getTime();
    const rightValue = new Date((right as any).execution?.requestedAt ?? (right as any).next_run ?? 0).getTime();
    return rightValue - leftValue;
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function EnvironmentDashboard({ instance: msalInstance }: Props) {
  const { ready: authReady, isAdmin, roles } = useAuthZ(msalInstance);
  const canManage = authReady && (isAdmin || roles.includes('EnvironmentAdmin') || roles.includes('EnvironmentEditor') || roles.includes('environment-manager'));

  const [environments, setEnvironments] = useState<DashboardEnvironment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const envList = await listEnvironments(msalInstance, { page: 0, perPage: 10, sortBy: 'name', sortDir: 'asc' });
      const detailed = await Promise.all(envList.environments.map((environment) => getEnvironment(msalInstance, environment.id)));
      const scheds = await listSchedules(msalInstance);
      setEnvironments(detailed);
      setSchedules(scheds);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load environment dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const metrics = useMemo(() => {
    const totalStages = environments.reduce((sum, environment) => sum + environment.stages.length, 0);
    const runningStages = environments.reduce(
      (sum, environment) => sum + environment.stages.filter((stage) => stage.status === 'running').length,
      0,
    );
    const incompleteEnvironments = environments.filter((environment) => getStageIncompleteCount(environment) > 0).length;

    return {
      totalEnvironments: environments.length,
      totalStages,
      runningStages,
      scheduledActions: schedules.filter((schedule) => schedule.enabled).length,
      incompleteEnvironments,
    };
  }, [environments, schedules]);

  const upcomingSchedules = useMemo(() => {
    return schedules
      .filter((schedule) => schedule.enabled && schedule.next_run)
      .sort((left, right) => new Date(left.next_run || 0).getTime() - new Date(right.next_run || 0).getTime())
      .slice(0, 6);
  }, [schedules]);

  const recentExecutionSignal = useMemo(() => {
    const allExecutions = flattenExecutions(environments);
    const failures = sortByRequestedAtDescending(
      allExecutions.filter(({ execution }) => execution.status === 'failed' || execution.status === 'partially_failed'),
    ).slice(0, 5);
    const recent = sortByRequestedAtDescending(allExecutions).slice(0, 6);
    return { failures, recent };
  }, [environments]);

  const attentionItems = useMemo(() => {
    const incomplete = environments
      .map((environment) => ({
        environment,
        incompleteCount: getStageIncompleteCount(environment),
      }))
      .filter((item) => item.incompleteCount > 0)
      .slice(0, 5);

    const withoutSchedules = environments
      .filter((environment) => !(environment.schedules ?? []).some((schedule) => schedule.enabled))
      .slice(0, 5);

    return { incomplete, withoutSchedules };
  }, [environments]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environments dashboard"
        description="Track what is running, what needs attention, and what is scheduled next across managed environments."
        actions={
          <>
            <button className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`} onClick={() => void refresh()}>
              <RefreshCw className="mr-2 inline h-4 w-4" />
              Refresh
            </button>
            {canManage ? (
              <Link to="/environment/manage" className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`}>
                Open Environments management
              </Link>
            ) : null}
          </>
        }
      />

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load environment dashboard data. {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <PageStatCard label="Environments" value={metrics.totalEnvironments} detail="Managed environment records" />
        <PageStatCard label="Stages" value={metrics.totalStages} detail="Configured operating stages" />
        <PageStatCard label="Running stages" value={metrics.runningStages} detail="Currently marked running" />
        <PageStatCard label="Scheduled actions" value={metrics.scheduledActions} detail="Enabled recurring stage actions" />
        <PageStatCard label="Need attention" value={metrics.incompleteEnvironments + recentExecutionSignal.failures.length} detail="Failures or incomplete configuration" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="ui-panel rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Needs attention</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Focus first on failed runs, incomplete setup, and environments without schedules.</p>
            </div>
            <AlertTriangle className="mt-1 h-5 w-5 text-[var(--status-warning-text)]" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
              <div className="ui-section-eyebrow">Failed executions</div>
              <div className="mt-3 space-y-3">
                {recentExecutionSignal.failures.length === 0 ? (
                  <div className="text-sm ui-text-muted">No recent failed executions.</div>
                ) : (
                  recentExecutionSignal.failures.map(({ environment, stage, execution }) => (
                    <Link key={execution.executionId} to={`/environment/${environment.id}/executions`} className="block rounded-xl border border-[var(--border-subtle)] px-3 py-3 transition hover:bg-[var(--surface-hover)]">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{environment.name}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{stage.name} - {execution.status.replace('_', ' ')}</div>
                      <div className="mt-1 text-xs ui-text-muted">{formatDateTime(execution.requestedAt)}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
              <div className="ui-section-eyebrow">Incomplete setup</div>
              <div className="mt-3 space-y-3">
                {attentionItems.incomplete.length === 0 ? (
                  <div className="text-sm ui-text-muted">No incomplete environment configuration.</div>
                ) : (
                  attentionItems.incomplete.map(({ environment, incompleteCount }) => (
                    <Link key={environment.id} to={`/environment/edit/${environment.id}`} className="block rounded-xl border border-[var(--border-subtle)] px-3 py-3 transition hover:bg-[var(--surface-hover)]">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{environment.name}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">{incompleteCount} incomplete Azure service field{incompleteCount === 1 ? '' : 's'}</div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-subtle)] p-4">
              <div className="ui-section-eyebrow">No schedules</div>
              <div className="mt-3 space-y-3">
                {attentionItems.withoutSchedules.length === 0 ? (
                  <div className="text-sm ui-text-muted">Every environment has at least one enabled schedule.</div>
                ) : (
                  attentionItems.withoutSchedules.map((environment) => (
                    <Link key={environment.id} to="/environment/schedules" className="block rounded-xl border border-[var(--border-subtle)] px-3 py-3 transition hover:bg-[var(--surface-hover)]">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">{environment.name}</div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">No enabled schedule is configured yet.</div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="ui-panel rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Upcoming scheduled actions</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">The next stage actions due to run across the estate.</p>
            </div>
            <CalendarClock className="mt-1 h-5 w-5 text-[var(--accent-primary)]" />
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading dashboard data...</div>
            ) : upcomingSchedules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm ui-text-muted">
                No upcoming enabled schedules found.
              </div>
            ) : (
              upcomingSchedules.map((schedule) => (
                <Link key={schedule.id} to="/environment/schedules" className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition hover:bg-[var(--surface-hover)]">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{schedule.environment}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{schedule.stage} · {schedule.action}</div>
                    <div className="mt-1 text-xs ui-text-muted">{schedule.timezone || 'No timezone'} - {formatDateTime(schedule.next_run)}</div>
                  </div>
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="ui-panel rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Recent execution outcomes</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">The latest start and stop activity across all stages.</p>
            </div>
            <Clock3 className="mt-1 h-5 w-5 text-[var(--text-muted)]" />
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading dashboard data...</div>
            ) : recentExecutionSignal.recent.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm ui-text-muted">
                No recent executions found yet.
              </div>
            ) : (
              recentExecutionSignal.recent.map(({ environment, stage, execution }) => (
                <Link key={execution.executionId} to={`/environment/${environment.id}/executions`} className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition hover:bg-[var(--surface-hover)]">
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{environment.name}</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">{stage.name} - {execution.action} - {execution.status.replace('_', ' ')}</div>
                    <div className="mt-1 text-xs ui-text-muted">{formatDateTime(execution.requestedAt)}</div>
                  </div>
                  {execution.status === 'failed' || execution.status === 'partially_failed' ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning-text)]" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="ui-panel rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Quick links</h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Jump to the environment workflows you need most often.</p>
            </div>
            <Settings2 className="mt-1 h-5 w-5 text-[var(--text-muted)]" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3">
            <Link to="/environment/manage" className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition hover:bg-[var(--surface-hover)]">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Manage environments</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">Create, edit, and organize environment setup.</div>
              </div>
              <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>
            <Link to="/environment/schedules" className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition hover:bg-[var(--surface-hover)]">
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">Schedules</div>
                <div className="mt-1 text-sm text-[var(--text-secondary)]">Review recurrence, timing, and notifications.</div>
              </div>
              <ExternalLink className="h-4 w-4 text-[var(--text-muted)]" />
            </Link>
            {environments.slice(0, 2).map((environment) => (
              <Link key={environment.id} to={`/environment/${environment.id}`} className="flex items-center justify-between rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition hover:bg-[var(--surface-hover)]">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">{environment.name}</div>
                  <div className="mt-1 text-sm text-[var(--text-secondary)]">{environment.client || 'No client'} - {environment.stages.length} stage{environment.stages.length === 1 ? '' : 's'}</div>
                </div>
                <Server className="h-4 w-4 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
