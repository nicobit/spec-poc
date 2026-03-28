import { useCallback, useEffect, useMemo, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';

import { ActivityEntry, EnvInstance, Schedule, getActivity, listEnvironments, listSchedules, startStage, stopStage } from '../api';
import { useNavigate } from 'react-router-dom';
import ActivityModal from './ActivityModal';
import { PageHeader, PageStatCard } from '@/shared/ui/PageHeader';
import { themeClasses } from '@/theme/themeClasses';
import { useAuthZ } from '@/auth/useAuthZ';

type Props = { instance: IPublicClientApplication };
type Filters = { client?: string; stage?: string; action?: string };

export default function EnvironmentDashboard({ instance: msalInstance }: Props) {
  const { ready: authReady, isAdmin, roles } = useAuthZ(msalInstance);
  const canEditEnvironments = authReady && (isAdmin || roles.includes('EnvironmentAdmin') || roles.includes('EnvironmentEditor') || roles.includes('Editor'));

  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [totalEnvs, setTotalEnvs] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedActivityEnvId, setSelectedActivityEnvId] = useState<string | null>(null);
  const [activityMap, setActivityMap] = useState<Record<string, ActivityEntry[]>>({});
  const [activityTotal, setActivityTotal] = useState<Record<string, number>>({});
  const [activityPage, setActivityPage] = useState<Record<string, number>>({});
  const [activityLoading, setActivityLoading] = useState<Record<string, boolean>>({});
  const [activityFilters, setActivityFilters] = useState<Record<string, Filters>>({});
  const [selectedEntry, setSelectedEntry] = useState<ActivityEntry | null>(null);
  

  // useNavigate throws when rendered outside a Router (unit tests). Provide a noop fallback so tests can render.
  let navigate = (() => {
    try {
      return useNavigate();
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      return () => {};
    }
  })();

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [envResp, scheds] = await Promise.all([listEnvironments(msalInstance, { page, perPage }), listSchedules(msalInstance)]);
      setInstances(envResp.environments);
      setTotalEnvs(envResp.total);
      setSchedules(scheds);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load environments and schedules.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance, page, perPage]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadActivityPage = useCallback(async (envId: string, page: number, filters?: Filters) => {
    setActivityLoading((state) => ({ ...state, [envId]: true }));
    try {
      const effective = filters ?? activityFilters[envId] ?? {};
      const response = await getActivity(msalInstance, envId, {
        page,
        perPage: 10,
        client: effective.client,
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="text-md font-semibold">Live environments</h4>
                          <div className="flex items-center gap-2">
                            <a href="/environment/manage" className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}>Manage environments</a>
                            <div className="flex items-center gap-2">
                              <button
                                disabled={page <= 0}
                                onClick={() => { setPage((p) => Math.max(0, p - 1)); void refresh(); }}
                                className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                              >
                                Prev
                              </button>
                              <div className="text-sm ui-text-muted">Page {page + 1} / {totalPages}</div>
                              <button
                                disabled={page >= totalPages - 1}
                                onClick={() => { setPage((p) => p + 1); void refresh(); }}
                                className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        </div>
      <PageHeader
        title="Environment dashboard"
        description="Monitor stage status and recent activity here. Use the Resources and Schedules pages for configuration and scheduling."
        actions={<button className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`} onClick={() => void refresh()}>Refresh</button>}
      />

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load environments or schedules. {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <PageStatCard label="Environments" value={instances.length} />
        <PageStatCard label="Stages" value={stageCount} />
        <PageStatCard label="Schedules" value={schedules.length} />
        <PageStatCard label="Selected activity" value={selectedActivityEnv?.name ?? 'None selected'} />
      </div>

      <section className="ui-panel rounded-2xl p-4">
        <div className="mb-3 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-medium text-[var(--text-primary)]">Live environments</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Start or stop stages, then drill into recent activity. Resource configuration and schedule maintenance have dedicated pages.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading environments...</div>
        ) : (
          <div className="space-y-4">
            {/* Partition persisted vs draft environments. Draft detection: explicit draft flag or id prefix 'draft-' */}
            {(() => {
              const isDraft = (e: EnvInstance) => {
                return Boolean((e as any).draft === true || !e.id || e.id.startsWith?.('draft-'));
              };

              const drafts = instances.filter(isDraft);
              const persisted = instances.filter((i) => !isDraft(i));

              const statusOrder = (s: string) => {
                switch (s) {
                  case 'running':
                    return 0;
                  case 'starting':
                    return 1;
                  case 'stopped':
                    return 2;
                  case 'stopping':
                    return 3;
                  default:
                    return 10;
                }
              };

              const persistedSorted = persisted.slice().sort((a, b) => {
                const diff = statusOrder(a.status) - statusOrder(b.status);
                return diff !== 0 ? diff : a.name.localeCompare(b.name);
              });

              const createDraft = () => {
                const draft: EnvInstance & { draft?: true } = {
                  id: `draft-${Date.now()}`,
                  name: 'New environment',
                  status: 'stopped',
                  stages: [],
                  draft: true,
                };
                setInstances((s) => [draft as EnvInstance, ...s]);
                setSelectedActivityEnvId(draft.id);
              };

              return (
                <>
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-md font-semibold">Live environments</h4>
                        <div className="flex items-center gap-2">
                          {canEditEnvironments ? (
                            <button
                              onClick={() => navigate('/environment/create')}
                              className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`}
                            >
                              New environment
                            </button>
                          ) : null}
                          <div className="flex items-center gap-2">
                            <button
                              disabled={page <= 0}
                              onClick={() => { setPage((p) => Math.max(0, p - 1)); void refresh(); }}
                              className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                            >
                              Prev
                            </button>
                            <div className="text-sm ui-text-muted">Page {page + 1} / {totalPages}</div>
                            <button
                              disabled={page >= totalPages - 1}
                              onClick={() => { setPage((p) => p + 1); void refresh(); }}
                              className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      </div>

                  {persistedSorted.map((environment) => (
                    <div key={environment.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                      <div className="mb-3">
                        <h4 className="font-medium text-[var(--text-primary)]">
                          <button className="hover:underline" onClick={() => navigate(`/environment/${environment.id}`)}>{environment.name}</button>
                        </h4>
                        <div className="mt-1 text-sm text-[var(--text-secondary)]">
                          {[environment.region, environment.client].filter(Boolean).join(' | ')}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {environment.stages.map((stage) => (
                          <div key={stage.id} className="rounded-2xl border border-[var(--border-subtle)] p-4">
                            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-[var(--text-primary)]">{stage.name}</h5>
                                  <span className="rounded bg-[var(--surface-panel-muted)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                                    {stage.status}
                                  </span>
                                </div>
                                <div className="mt-1 text-sm text-[var(--text-secondary)]">
                                  {stage.resourceActions.length} resource action(s) | {stage.notificationGroups.length} notification group(s)
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {stage.status === 'running' ? (
                                  <button
                                    onClick={() => void stopStage(msalInstance, environment.id, stage.id).then(refresh)}
                                    aria-label={`Stop ${environment.name} ${stage.name}`}
                                    className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
                                  >
                                    Stop
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => void startStage(msalInstance, environment.id, stage.id).then(refresh)}
                                    aria-label={`Start ${environment.name} ${stage.name}`}
                                    className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`}
                                  >
                                    Start
                                  </button>
                                )}
                                {canEditEnvironments ? (
                                  <button
                                    onClick={() => navigate(`/environment/edit/${environment.id}`)}
                                    aria-label={`Edit ${environment.name}`}
                                    className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
                                  >
                                    Edit
                                  </button>
                                ) : null}
                                <button
                                  onClick={() => void loadActivityPage(environment.id, 0, {
                                    ...activityFilters[environment.id],
                                    stage: stage.name,
                                  })}
                                  aria-label={`View activity ${environment.name}`}
                                  className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
                                >
                                  View activity
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Draft creation has been removed from the dashboard. Use the dedicated Create page for environment authoring. */}
                </>
              );
            })()}
          </div>
        )}
      </section>

      <section className="ui-panel rounded-2xl p-4">
        <div className="ui-divider flex flex-col gap-3 border-b pb-4">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-medium text-[var(--text-primary)]">Activity</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {selectedActivityEnvId
                  ? `Review recent activity for ${selectedActivityEnv?.name ?? selectedActivityEnvId}.`
                  : 'Select a stage and choose View activity to load recent events.'}
              </p>
            </div>
            {selectedActivityEnvId ? <div className="text-xs ui-text-muted">{activityCount} total entries</div> : null}
          </div>

          {selectedActivityEnvId ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label="Client filter"
                placeholder="Client"
                value={activityFilters[selectedActivityEnvId]?.client || ''}
                onChange={(event) => setActivityFilters((state) => ({
                  ...state,
                  [selectedActivityEnvId]: { ...state[selectedActivityEnvId], client: event.target.value || undefined },
                }))}
                className={`${themeClasses.field} rounded px-2 py-1 text-sm`}
              />
              <input
                aria-label="Stage filter"
                placeholder="Stage"
                value={activityFilters[selectedActivityEnvId]?.stage || ''}
                onChange={(event) => setActivityFilters((state) => ({
                  ...state,
                  [selectedActivityEnvId]: { ...state[selectedActivityEnvId], stage: event.target.value || undefined },
                }))}
                className={`${themeClasses.field} rounded px-2 py-1 text-sm`}
              />
              <input
                aria-label="Action filter"
                placeholder="Action"
                value={activityFilters[selectedActivityEnvId]?.action || ''}
                onChange={(event) => setActivityFilters((state) => ({
                  ...state,
                  [selectedActivityEnvId]: { ...state[selectedActivityEnvId], action: event.target.value || undefined },
                }))}
                className={`${themeClasses.field} rounded px-2 py-1 text-sm`}
              />
              <button
                onClick={() => void loadActivityPage(selectedActivityEnvId, 0)}
                className={`${themeClasses.buttonPrimary} rounded px-3 py-1.5 text-sm`}
              >
                Apply
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-4">
          {!selectedActivityEnvId ? (
            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm ui-text-muted">
              Choose an environment stage and select View activity to load recent events.
            </div>
          ) : activityLoading[selectedActivityEnvId] ? (
            <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading activity...</div>
          ) : activityEntries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm ui-text-muted">
              No activity found for the current filters.
            </div>
          ) : (
            <>
              <ul className="divide-y divide-[var(--border-subtle)]">
                {activityEntries.map((entry) => (
                  <li key={entry.RowKey || `${entry.timestamp}-${entry.action}-${entry.status}`} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <div className="font-medium text-[var(--text-primary)]">
                        {entry.eventType || entry.action || entry.status || 'Activity'}
                      </div>
                      <div className="mt-1 text-xs ui-text-muted">
                        {new Date(entry.timestamp || entry.Timestamp || '').toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEntry(entry)}
                      className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-xs`}
                    >
                      Details
                    </button>
                  </li>
                ))}
              </ul>

              {activityCount > 10 ? (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-[var(--text-secondary)]">
                    Page {activityCurrentPage + 1} / {activityPages}
                  </div>
                  <div className="space-x-2">
                    <button
                      disabled={activityCurrentPage === 0}
                      onClick={() => void loadActivityPage(selectedActivityEnvId, Math.max(0, activityCurrentPage - 1))}
                      className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                    >
                      Prev
                    </button>
                    <button
                      disabled={activityCurrentPage >= activityPages - 1}
                      onClick={() => void loadActivityPage(selectedActivityEnvId, Math.min(activityPages - 1, activityCurrentPage + 1))}
                      className={`${themeClasses.buttonSecondary} rounded px-2 py-1 text-sm disabled:opacity-50`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <ActivityModal open={!!selectedEntry} onClose={() => setSelectedEntry(null)} entry={selectedEntry} />
    </div>
  );
}
