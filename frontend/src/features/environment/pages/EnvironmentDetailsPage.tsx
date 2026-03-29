import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import {
  Activity,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Layers,
  PencilLine,
  Play,
  RotateCcw,
  Server,
  Square,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  XCircle,
} from 'lucide-react';
import { enqueueSnackbar } from 'notistack';

import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';

import {
  type EnvInstance,
  type ResourceAction,
  type StageExecution,
  getEnvironment,
  startEnvironment,
  startStage,
  stopEnvironment,
  stopStage,
} from '../api';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import { describeSchedule } from '../scheduleRecurrence';

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
    <div className={`${themeClasses.formSection} rounded-3xl p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={themeClasses.sectionEyebrow}>{label}</div>
          <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
          {detail ? <div className={`${themeClasses.helperText} mt-1`}>{detail}</div> : null}
        </div>
        <div className="rounded-xl bg-[var(--surface-subsection)] p-2 text-[var(--text-secondary)]">{icon}</div>
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

function getResourceProperty(action: ResourceAction, key: string) {
  const properties = (action as any).properties || {};
  if (properties && properties[key] != null) return properties[key];
  return (action as any)[key];
}

function getResourceSummary(action: ResourceAction) {
  switch (action.type) {
    case 'sql-vm':
      return [
        action.subscriptionId,
        action.resourceGroup,
        getResourceProperty(action, 'vmName') || getResourceProperty(action, 'serverName'),
      ]
        .filter(Boolean)
        .join(' | ');
    case 'sql-managed-instance':
      return [
        action.subscriptionId,
        action.resourceGroup,
        getResourceProperty(action, 'managedInstanceName') || getResourceProperty(action, 'instanceName'),
      ]
        .filter(Boolean)
        .join(' | ');
    case 'synapse-sql-pool':
      return [
        action.subscriptionId,
        getResourceProperty(action, 'workspaceName'),
        getResourceProperty(action, 'sqlPoolName') || getResourceProperty(action, 'poolName'),
      ]
        .filter(Boolean)
        .join(' | ');
    case 'service-bus-message':
      return [
        getResourceProperty(action, 'namespace'),
        getResourceProperty(action, 'entityType'),
        getResourceProperty(action, 'entityName'),
      ]
        .filter(Boolean)
        .join(' | ');
    default:
      return '';
  }
}

function resolveScheduleStageLabel(
  schedule: { stage?: string | null; stage_id?: string | null },
  stages: Array<{ id: string; name: string }> = [],
) {
  if (schedule.stage_id) {
    const matchedStage = stages.find((stage) => stage.id === schedule.stage_id);
    if (matchedStage?.name) return matchedStage.name;
  }
  if (schedule.stage) {
    const matchedStageByName = stages.find(
      (stage) => String(stage.name || '').toLowerCase() === String(schedule.stage || '').toLowerCase(),
    );
    if (matchedStageByName?.name) return matchedStageByName.name;
  }
  return '';
}

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

function getExecutionSummary(execution?: StageExecution | null) {
  if (!execution) return 'No execution recorded yet.';
  const completed = execution.completedAt || execution.startedAt || execution.requestedAt;
  const prefix = execution.source === 'schedule' ? 'Scheduled run' : 'Manual run';
  return `${prefix}: ${formatTimestamp(completed)}`;
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
  const [expandedAzureServices, setExpandedAzureServices] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    if (!env) return;
    setExpandedAzureServices((current) =>
      Object.fromEntries(env.stages.map((stage) => [stage.id, current[stage.id] ?? false])),
    );
  }, [env]);

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
      description="Inspect client context, stage status, Azure services, schedules, and recent activity."
      loading={loading}
      actions={
        <>
          {canEdit ? (
            <>
              <button
                className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                onClick={() => navigate(`/environment/edit/${id}`)}
              >
                <PencilLine className="h-4 w-4" />
                Edit environment
              </button>
              <button
                className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                onClick={() => navigate('/environment/schedules')}
              >
                <CalendarClock className="h-4 w-4" />
                Schedules
              </button>
              <button
                className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                onClick={() => navigate(`/environment/${id}/executions`)}
              >
                <RotateCcw className="h-4 w-4" />
                Execution history
              </button>
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
      {!loading && !env ? (
        <div className="rounded-2xl border border-red-200 p-4">Environment not found.</div>
      ) : !loading && env ? (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.9fr)]">
            <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className={themeClasses.sectionEyebrow}>Overview</div>
              <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  {env.client ? (
                    <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{env.client}</div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-medium tracking-tight text-[var(--text-secondary)]">{env.name}</h2>
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      {env.status || 'unknown'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
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

            <aside className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className={themeClasses.sectionEyebrow}>Derived types</div>
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
                  <span className={themeClasses.helperText}>No resource types configured yet.</span>
                )}
              </div>
            </aside>
          </section>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Stages" value={stageCount} detail="Configured operating stages" icon={<Layers className="h-4 w-4" />} />
            <StatCard
              label="Azure services"
              value={resourceCount}
              detail="Configured service actions across all stages"
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

          <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className={themeClasses.sectionEyebrow}>Stages</div>
                <p className={`${themeClasses.helperText} mt-2`}>
                  Review each stage, its Azure services, and its current lifecycle status.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {env.stages.map((stage) => (
                <article key={stage.id} className={`${themeClasses.stageCard} rounded-3xl p-5`}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)]">{stage.name}</h3>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                          {stage.status}
                        </span>
                        <button
                          type="button"
                          className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                          aria-expanded={expandedAzureServices[stage.id] === true}
                          aria-controls={`stage-details-${stage.id}`}
                          onClick={() =>
                            setExpandedAzureServices((current) => ({
                              ...current,
                              [stage.id]: !current[stage.id],
                            }))
                          }
                        >
                          {expandedAzureServices[stage.id] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          {expandedAzureServices[stage.id] ? 'Hide details' : 'View details'}
                        </button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {stage.resourceActions.length} Azure service action{stage.resourceActions.length === 1 ? '' : 's'}
                        </span>
                        {stage.resourceActions.length > 0 ? (
                          <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                            {Array.from(
                              new Set(stage.resourceActions.map((resourceAction) => getResourceTypeLabel(resourceAction.type))),
                            ).join(', ')}
                          </span>
                        ) : null}
                        {stage.latestExecution ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getExecutionStatusTone(
                              stage.latestExecution.status,
                            )}`}
                          >
                            {getExecutionStatusIcon(stage.latestExecution.status)}
                            {stage.latestExecution.status.replace(/_/g, ' ')}
                          </span>
                        ) : null}
                      </div>
                      <div className={`${themeClasses.helperText} mt-3`}>
                        {getExecutionSummary(stage.latestExecution)}
                        {stage.latestExecution?.message ? ` · ${stage.latestExecution.message}` : ''}
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

                  {expandedAzureServices[stage.id] && (
                    <div id={`stage-details-${stage.id}`} className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.8fr)]">
                      <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                        <div className={themeClasses.fieldLabel}>Azure services</div>
                        {stage.resourceActions.length > 0 ? (
                          <div className="mt-3 space-y-3">
                            {stage.resourceActions.map((resourceAction, index) => (
                              <div key={`${resourceAction.type}-${index}`} className="rounded-xl bg-[var(--surface-elevated)] px-3 py-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                                    {getResourceTypeLabel(resourceAction.type)}
                                  </span>
                                </div>
                                <div className={`${themeClasses.helperText} mt-2`}>
                                  {getResourceSummary(resourceAction as ResourceAction) || 'Configuration summary not available.'}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`${themeClasses.helperText} mt-3`}>No Azure services configured for this stage.</div>
                        )}
                      </div>

                      <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                        <div className={themeClasses.fieldLabel}>Additional settings</div>
                        {stage.azureConfig && Object.keys(stage.azureConfig).length > 0 ? (
                          <div className="mt-3 space-y-2">
                            {Object.entries(stage.azureConfig).map(([key, value]) => (
                              <div key={key} className="rounded-xl bg-[var(--surface-elevated)] px-3 py-2">
                                <div className={themeClasses.sectionEyebrow}>{key}</div>
                                <div className={`${themeClasses.helperText} mt-1`}>
                                  {typeof value === 'string' ? value : JSON.stringify(value)}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={`${themeClasses.helperText} mt-3`}>No additional Azure config recorded for this stage.</div>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className={themeClasses.sectionEyebrow}>Schedules</div>
                  <p className={`${themeClasses.helperText} mt-2`}>Review the recurring actions configured for this environment.</p>
                </div>
                <button
                  className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                  onClick={() => navigate('/environment/schedules')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Manage schedules
                </button>
              </div>

              {Array.isArray((env as any).schedules) && (env as any).schedules.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {(env as any).schedules.map((schedule: any) => (
                    <div key={schedule.id || schedule.stage || schedule.action} className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                      {(() => {
                        const scheduleStageLabel = resolveScheduleStageLabel(schedule, env.stages || []);
                        return (
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {schedule.action} {scheduleStageLabel ? `- ${scheduleStageLabel}` : ''}
                        </div>
                        <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                          {schedule.enabled === false ? 'Disabled' : 'Enabled'}
                        </span>
                      </div>
                        );
                      })()}
                      <div className={`${themeClasses.helperText} mt-2`}>
                        {describeSchedule(schedule.action, schedule.cron, schedule.timezone)}
                      </div>
                      <div className={`${themeClasses.helperText} mt-1`}>
                        Next run: {formatTimestamp(schedule.next_run)}
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
                      {schedule.latestExecution?.message ? (
                        <div className={`${themeClasses.helperText} mt-2`}>{schedule.latestExecution.message}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${themeClasses.emptyState} mt-4 rounded-2xl px-4 py-8 text-sm`}>
                  No schedules configured.
                </div>
              )}
            </div>

            <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className={themeClasses.sectionEyebrow}>Recent activity</div>
                  <p className={`${themeClasses.helperText} mt-2`}>Latest recorded events for this environment.</p>
                </div>
                <button
                  className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                  onClick={() => navigate(`/environment/${id}/executions`)}
                >
                  <ExternalLink className="h-4 w-4" />
                  View execution history
                </button>
              </div>

              {((env as any).activity?.entries || []).length > 0 ? (
                <div className="mt-4 space-y-3">
                  {((env as any).activity.entries || []).map((activityEntry: any, index: number) => (
                    <div key={activityEntry.RowKey || `${activityEntry.timestamp}-${index}`} className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
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
                      <div className={`${themeClasses.helperText} mt-2`}>{formatTimestamp(activityEntry.timestamp)}</div>
                      <div className={`${themeClasses.helperText} mt-2`}>
                        {activityEntry.requestedBy || activityEntry.message || activityEntry.client || 'No additional details available.'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`${themeClasses.emptyState} mt-4 rounded-2xl px-4 py-8 text-sm`}>
                  No recent activity.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

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
