import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  Activity,
  CalendarClock,
  Layers,
  Play,
  Server,
  Square,
  Zap,
} from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';

import {
  type EnvInstance,
  getEnvironment,
  startEnvironment,
  startStage,
  stopEnvironment,
  stopStage,
} from '../api';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

type ConfirmState = {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => Promise<void>;
};

function StatCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="ui-panel rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
          {detail ? <div className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</div> : null}
        </div>
        <div className="rounded-xl bg-[var(--surface-panel-muted)] p-2 text-[var(--text-secondary)]">{icon}</div>
      </div>
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
      return 'Service Bus';
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

function formatTimestamp(value?: string | null) {
  if (!value) return 'n/a';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function EnvironmentDetailsPage() {
  const { id } = useParams();
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [env, setEnv] = useState<EnvInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const { ready: authReady, isAdmin, roles } = useAuthZ(instance);

  const canEdit =
    authReady &&
    (isAdmin ||
      roles.some((role: string) =>
        ['environmentadmin', 'environmenteditor', 'environment-manager'].includes((role || '').toLowerCase()),
      ));

  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);

    void (async () => {
      try {
        const details = await getEnvironment(instance, id);
        if (!mounted) return;
        setEnv(details);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, instance]);

  const stageCount = env?.stages?.length || 0;
  const resourceCount = env?.stages?.reduce((total, stage) => total + (stage.resourceActions?.length || 0), 0) || 0;
  const scheduleCount = Array.isArray((env as any)?.schedules) ? (env as any).schedules.length : 0;
  const derivedTypes = useMemo(
    () =>
      Array.from(
        new Set(
          (env?.stages || []).flatMap((stage) =>
            (stage.resourceActions || []).map((resourceAction) => getResourceTypeLabel(resourceAction.type)),
          ),
        ),
      ),
    [env],
  );

  if (!id) return <div className="p-4">Missing environment id</div>;

  return (
    <EnvironmentPageLayout
      title="Environment Details"
      description="Inspect stages, lifecycle status, resource actions, schedules, and recent activity."
      actions={
        <>
          {canEdit ? (
            <>
              <button
                className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                onClick={() => {
                  setConfirmState({
                    open: true,
                    title: 'Start environment',
                    message: 'Start this environment?',
                    onConfirm: async () => {
                      try {
                        await startEnvironment(instance, id);
                        setEnv((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            status: 'starting',
                            stages: current.stages.map((stage, index) =>
                              index === 0 ? { ...stage, status: 'starting' } : stage,
                            ),
                          };
                        });
                      } catch (error) {
                        enqueueSnackbar('Failed to start environment.', { variant: 'error' });
                      }
                    },
                  });
                }}
              >
                <Play className="h-4 w-4" />
                Start
              </button>
              <button
                className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                onClick={() => {
                  setConfirmState({
                    open: true,
                    title: 'Stop environment',
                    message: 'Stop this environment?',
                    onConfirm: async () => {
                      try {
                        await stopEnvironment(instance, id);
                        setEnv((current) => {
                          if (!current) return current;
                          return {
                            ...current,
                            status: 'stopping',
                            stages: current.stages.map((stage, index) =>
                              index === 0 ? { ...stage, status: 'stopping' } : stage,
                            ),
                          };
                        });
                      } catch (error) {
                        enqueueSnackbar('Failed to stop environment.', { variant: 'error' });
                      }
                    },
                  });
                }}
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </>
          ) : null}
          <button
            className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
            onClick={() => {
              try {
                navigate(-1);
              } catch {
                navigate('/environment/manage');
              }
            }}
          >
            Back
          </button>
        </>
      }
    >
      {loading ? (
        <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading environment details...</div>
      ) : !env ? (
        <div className="rounded-2xl border border-red-200 p-4">Environment not found.</div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
            <div className="ui-panel rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Overview</div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{env.name}</h2>
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  {env.status || 'unknown'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {env.client ? (
                  <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    Client {env.client}
                  </span>
                ) : null}
                {env.region ? (
                  <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    Region {env.region}
                  </span>
                ) : null}
                {env.lifecycle ? (
                  <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                    Lifecycle {env.lifecycle}
                  </span>
                ) : null}
              </div>
            </div>

            <aside className="ui-panel rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Derived types</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {derivedTypes.length > 0 ? (
                  derivedTypes.map((type) => (
                    <span
                      key={type}
                      className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                    >
                      {type}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-[var(--text-secondary)]">No resource types configured yet.</span>
                )}
              </div>
            </aside>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Stages" value={stageCount} detail="Configured operating stages" icon={<Layers className="h-4 w-4" />} />
            <StatCard
              label="Resource actions"
              value={resourceCount}
              detail="Azure actions across all stages"
              icon={<Server className="h-4 w-4" />}
            />
            <StatCard
              label="Schedules"
              value={scheduleCount}
              detail={scheduleCount > 0 ? 'Recurring lifecycle schedules' : 'No schedules configured'}
              icon={<CalendarClock className="h-4 w-4" />}
            />
            <StatCard
              label="Recent activity"
              value={((env as any).activity?.entries || []).length}
              detail="Latest recorded events"
              icon={<Activity className="h-4 w-4" />}
            />
          </section>

          <section className="ui-panel rounded-2xl p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Stages</div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Review each stage, its resource actions, and its current lifecycle status.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {env.stages.map((stage) => (
                <article key={stage.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{stage.name}</h3>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          {stage.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {stage.resourceActions.length} action{stage.resourceActions.length === 1 ? '' : 's'}
                        </span>
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {stage.notificationGroups?.length || 0} notification group{stage.notificationGroups?.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: `Start stage ${stage.name}`,
                            message: `Start stage ${stage.name}?`,
                            onConfirm: async () => {
                              try {
                                await startStage(instance, (env as any).id, stage.id);
                                setEnv((current) => {
                                  if (!current) return current;
                                  return {
                                    ...current,
                                    stages: current.stages.map((currentStage) =>
                                      currentStage.id === stage.id ? { ...currentStage, status: 'starting' } : currentStage,
                                    ),
                                  };
                                });
                              } catch {
                                enqueueSnackbar(`Failed to start stage ${stage.name}.`, { variant: 'error' });
                              }
                            },
                          });
                        }}
                      >
                        <Play className="h-4 w-4" />
                        Start stage
                      </button>
                      <button
                        className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                        onClick={() => {
                          setConfirmState({
                            open: true,
                            title: `Stop stage ${stage.name}`,
                            message: `Stop stage ${stage.name}?`,
                            onConfirm: async () => {
                              try {
                                await stopStage(instance, (env as any).id, stage.id);
                                setEnv((current) => {
                                  if (!current) return current;
                                  return {
                                    ...current,
                                    stages: current.stages.map((currentStage) =>
                                      currentStage.id === stage.id ? { ...currentStage, status: 'stopping' } : currentStage,
                                    ),
                                  };
                                });
                              } catch {
                                enqueueSnackbar(`Failed to stop stage ${stage.name}.`, { variant: 'error' });
                              }
                            },
                          });
                        }}
                      >
                        <Square className="h-4 w-4" />
                        Stop stage
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.8fr)]">
                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
                      <div className="text-sm font-medium text-[var(--text-primary)]">Resource actions</div>
                      {stage.resourceActions.length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {stage.resourceActions.map((resourceAction, index) => (
                            <div key={`${resourceAction.type}-${index}`} className="rounded-xl bg-[var(--surface-panel-muted)] px-3 py-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                                  {getResourceTypeLabel(resourceAction.type)}
                                </span>
                              </div>
                              <div className="mt-2 text-sm text-[var(--text-secondary)]">
                                {getResourceSummary(resourceAction as Record<string, any>) || 'Configuration summary not available.'}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-[var(--text-secondary)]">No resource actions configured for this stage.</div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] p-4">
                      <div className="text-sm font-medium text-[var(--text-primary)]">Stage configuration</div>
                      {stage.azureConfig && Object.keys(stage.azureConfig).length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {Object.entries(stage.azureConfig).map(([key, value]) => (
                            <div key={key} className="rounded-xl bg-[var(--surface-panel-muted)] px-3 py-2">
                              <div className="text-xs uppercase tracking-[0.16em] ui-text-muted">{key}</div>
                              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-[var(--text-secondary)]">No additional Azure config recorded for this stage.</div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="ui-panel rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Schedules</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Review the recurring actions configured for this environment.</p>

              {Array.isArray((env as any).schedules) && (env as any).schedules.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {(env as any).schedules.map((schedule: any) => (
                    <div key={schedule.id || schedule.stage || schedule.action} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {schedule.action} {schedule.stage ? `- ${schedule.stage}` : ''}
                        </div>
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {schedule.enabled === false ? 'Disabled' : 'Enabled'}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-[var(--text-secondary)]">
                        Next run: {formatTimestamp(schedule.next_run)}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        Timezone: {schedule.timezone || 'UTC'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm text-[var(--text-secondary)]">
                  No schedules configured.
                </div>
              )}
            </div>

            <div className="ui-panel rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Recent activity</div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">Latest recorded events for this environment.</p>

              {((env as any).activity?.entries || []).length > 0 ? (
                <div className="mt-4 space-y-3">
                  {((env as any).activity.entries || []).map((activityEntry: any, index: number) => (
                    <div key={activityEntry.RowKey || `${activityEntry.timestamp}-${index}`} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-[var(--text-primary)]">
                          {(activityEntry.action || activityEntry.eventType || 'activity').replace(/-/g, ' ')}
                        </div>
                        {activityEntry.status ? (
                          <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                            {activityEntry.status}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-[var(--text-secondary)]">{formatTimestamp(activityEntry.timestamp)}</div>
                      <div className="mt-2 text-sm text-[var(--text-secondary)]">
                        {activityEntry.requestedBy || activityEntry.message || activityEntry.client || 'No additional details available.'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm text-[var(--text-secondary)]">
                  No recent activity.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={async () => {
          const handler = confirmState.onConfirm;
          setConfirmState({ open: false });
          if (handler) await handler();
        }}
        onCancel={() => setConfirmState({ open: false })}
      />
    </EnvironmentPageLayout>
  );
}
