import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { AlertTriangle, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, Loader2, RotateCcw, XCircle } from 'lucide-react';

import { themeClasses } from '@/theme/themeClasses';

import { type EnvInstance, type StageExecution, getEnvironment, listEnvironmentExecutions } from '../api';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

const PAGE_SIZE = 10;

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

function getResourceResultSummary(result: NonNullable<StageExecution['resourceActionResults']>[number]) {
  return [result.subscriptionId, result.region, result.resourceIdentifier].filter(Boolean).join(' | ');
}

export default function EnvironmentExecutionHistoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { instance } = useMsal();

  const [environment, setEnvironment] = useState<EnvInstance | null>(null);
  const [executions, setExecutions] = useState<StageExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedStageId, setSelectedStageId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [expandedExecutionIds, setExpandedExecutionIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [details, executionPage] = await Promise.all([
          getEnvironment(instance, id),
          listEnvironmentExecutions(instance, id, { limit: 100 }),
        ]);
        if (!mounted) return;
        setEnvironment(details);
        setExecutions(executionPage.executions || []);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Failed to load execution history.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, instance]);

  useEffect(() => {
    setPage(0);
  }, [selectedStageId, selectedStatus]);

  const filteredExecutions = useMemo(() => {
    return executions.filter((execution) => {
      if (selectedStageId !== 'all' && execution.stageId !== selectedStageId) return false;
      if (selectedStatus !== 'all' && execution.status !== selectedStatus) return false;
      return true;
    });
  }, [executions, selectedStageId, selectedStatus]);

  const pageCount = Math.max(1, Math.ceil(filteredExecutions.length / PAGE_SIZE));
  const pagedExecutions = filteredExecutions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (!id) return <div className="p-4">Missing environment id</div>;

  return (
    <EnvironmentPageLayout
      title="Environment execution history"
      description="Review stage start/stop runs, execution outcomes, and per-resource action results for this environment."
      loading={loading}
      actions={
        <>
          <button
            className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
            onClick={() => {
              try {
                navigate(`/environment/${id}`);
              } catch {
                navigate('/environment/manage');
              }
            }}
          >
            Back to details
          </button>
        </>
      }
    >
      {!loading && error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load execution history. {error}
        </div>
      ) : null}

      {!loading && !error && environment ? (
        <div className="space-y-6">
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className={themeClasses.sectionEyebrow}>Environment</div>
              <div className="mt-4">
                {environment.client ? (
                  <div className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{environment.client}</div>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-medium tracking-tight text-[var(--text-secondary)]">{environment.name}</h2>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    {environment.status || 'unknown'}
                  </span>
                </div>
              </div>
            </div>

            <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
              <div className={themeClasses.sectionEyebrow}>Summary</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                  <div className={themeClasses.fieldLabel}>Executions</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{executions.length}</div>
                </div>
                <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                  <div className={themeClasses.fieldLabel}>Succeeded</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {executions.filter((execution) => execution.status === 'succeeded').length}
                  </div>
                </div>
                <div className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                  <div className={themeClasses.fieldLabel}>Needs attention</div>
                  <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                    {executions.filter((execution) => ['failed', 'partially_failed'].includes(execution.status)).length}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className={themeClasses.sectionEyebrow}>Execution history</div>
                <p className={`${themeClasses.helperText} mt-2`}>
                  Track scheduled and manual runs, including failures and per-resource results.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className={themeClasses.fieldLabel}>Stage</span>
                  <select
                    className={`${themeClasses.select} rounded-lg px-3 py-2`}
                    value={selectedStageId}
                    onChange={(event) => setSelectedStageId(event.target.value)}
                  >
                    <option value="all">All stages</option>
                    {(environment.stages || []).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className={themeClasses.fieldLabel}>Status</span>
                  <select
                    className={`${themeClasses.select} rounded-lg px-3 py-2`}
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="in_progress">In progress</option>
                    <option value="pending">Pending</option>
                    <option value="partially_failed">Partially failed</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
              </div>
            </div>

            {pagedExecutions.length > 0 ? (
              <div className="mt-5 space-y-4">
                {pagedExecutions.map((execution) => {
                  const isExpanded = expandedExecutionIds[execution.executionId] === true;
                  const stageName =
                    execution.stageName ||
                    environment.stages.find((stage) => stage.id === execution.stageId)?.name ||
                    execution.stageId;

                  return (
                    <article key={execution.executionId} className={`${themeClasses.stageCard} rounded-3xl p-5`}>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                              {execution.action} - {stageName}
                            </h3>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getExecutionStatusTone(
                                execution.status,
                              )}`}
                            >
                              {getExecutionStatusIcon(execution.status)}
                              {execution.status.replace(/_/g, ' ')}
                            </span>
                            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              {execution.source}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              Requested {formatTimestamp(execution.requestedAt)}
                            </span>
                            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              Completed {formatTimestamp(execution.completedAt || execution.startedAt)}
                            </span>
                            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
                              {execution.resourceActionResults.length} action{execution.resourceActionResults.length === 1 ? '' : 's'}
                            </span>
                          </div>
                          <div className={`${themeClasses.helperText} mt-3`}>
                            {execution.message || 'Execution recorded without an additional message.'}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
                          aria-expanded={isExpanded}
                          onClick={() =>
                            setExpandedExecutionIds((current) => ({
                              ...current,
                              [execution.executionId]: !current[execution.executionId],
                            }))
                          }
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {isExpanded ? 'Hide action results' : 'View action results'}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-5 space-y-3">
                          {execution.resourceActionResults.length > 0 ? (
                            execution.resourceActionResults.map((result) => (
                              <div key={result.resourceActionId} className={`${themeClasses.subsectionCard} rounded-2xl p-4`}>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-medium text-[var(--text-primary)]">{result.type}</span>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${getExecutionStatusTone(
                                      result.status as StageExecution['status'],
                                    )}`}
                                  >
                                    {getExecutionStatusIcon(result.status as StageExecution['status'])}
                                    {result.status.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <div className={`${themeClasses.helperText} mt-2`}>
                                  {getResourceResultSummary(result) || 'No resource identifier recorded.'}
                                </div>
                                {result.message ? <div className={`${themeClasses.helperText} mt-1`}>{result.message}</div> : null}
                              </div>
                            ))
                          ) : (
                            <div className={`${themeClasses.emptyState} rounded-2xl px-4 py-6 text-sm`}>
                              No per-resource action results were recorded for this execution.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={`${themeClasses.emptyState} mt-5 rounded-2xl px-4 py-8 text-sm`}>
                No executions match the current filters yet.
              </div>
            )}

            <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm ui-text-muted">
                Showing {pagedExecutions.length} of {filteredExecutions.length} executions
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0}
                  className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm disabled:opacity-50`}
                  onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
                >
                  Previous
                </button>
                <div className="text-sm text-[var(--text-secondary)]">
                  Page {Math.min(page + 1, pageCount)} of {pageCount}
                </div>
                <button
                  type="button"
                  disabled={(page + 1) * PAGE_SIZE >= filteredExecutions.length}
                  className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm disabled:opacity-50`}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </EnvironmentPageLayout>
  );
}
