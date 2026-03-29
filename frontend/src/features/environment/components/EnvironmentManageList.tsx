import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { ArrowUpDown, ChevronRight, Eye, MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';
import { enqueueSnackbar } from 'notistack';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import ConfirmDialog from '@/components/ConfirmDialog';
import SearchableSelect from '@/components/SearchableSelect';
import { useAuthZ } from '@/auth/useAuthZ';
import { useTheme } from '@/contexts/ThemeContext';
import { themeClasses } from '@/theme/themeClasses';

import { EnvInstance, deleteEnvironment, listEnvironments } from '../api';

type Props = { instance: IPublicClientApplication; refreshNonce?: number; onLoadingChange?: (loading: boolean) => void };

type ConfirmState = {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm?: () => Promise<void>;
};

function getStageStatusClasses(status?: string) {
  switch ((status || '').toLowerCase()) {
    case 'running':
      return {
        dot: 'bg-emerald-500',
        chip: 'bg-emerald-500/8 text-[var(--text-secondary)]',
      };
    case 'starting':
      return {
        dot: 'bg-amber-400',
        chip: 'bg-amber-400/8 text-[var(--text-secondary)]',
      };
    case 'stopping':
      return {
        dot: 'bg-orange-400',
        chip: 'bg-orange-400/8 text-[var(--text-secondary)]',
      };
    case 'stopped':
    default:
      return {
        dot: 'bg-rose-500',
        chip: 'bg-rose-500/8 text-[var(--text-secondary)]',
      };
  }
}

function summarizeClient(environments: EnvInstance[]) {
  const stages = environments.flatMap((environment) => environment.stages || []);
  const running = stages.filter((stage) => stage.status === 'running').length;
  const starting = stages.filter((stage) => stage.status === 'starting').length;
  const stopping = stages.filter((stage) => stage.status === 'stopping').length;
  const stopped = stages.filter((stage) => stage.status === 'stopped').length;

  return { running, starting, stopping, stopped };
}

function InventoryActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  destructive = false,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-45',
        destructive
          ? 'text-red-300 hover:bg-red-500/10 hover:text-red-200'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <span className="h-4 w-4">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default function EnvironmentManageList({ instance: msalInstance, refreshNonce = 0, onLoadingChange }: Props) {
  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false });

  const { ready: authReady, isAdmin, roles } = useAuthZ(msalInstance);
  const { themeId } = useTheme();
  const secondaryClass = themeId === 'commerce' ? 'commerce-ghost-button' : themeClasses.buttonSecondary;
  const canEdit = authReady && (isAdmin || roles.includes('EnvironmentAdmin') || roles.includes('EnvironmentEditor'));
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);
  const [clientFilter, setClientFilter] = useState<string | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string | undefined>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const resp = await listEnvironments(msalInstance, { page, perPage, client: clientFilter, sortBy, sortDir });
      setInstances(resp.environments);
      setTotal(resp.total);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load environments.');
    } finally {
      setLoading(false);
    }
  }, [msalInstance, page, perPage, clientFilter, sortBy, sortDir]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

  useEffect(() => {
    const params = Object.fromEntries([...searchParams.entries()].map(([key, value]) => [key, value]));
    if (params.client) setClientFilter(params.client as string);
    if (params.sortBy) setSortBy(params.sortBy as string);
    if (params.sortDir && (params.sortDir === 'asc' || params.sortDir === 'desc')) setSortDir(params.sortDir as 'asc' | 'desc');
    if (params.page) {
      const pageNumber = Number(params.page);
      if (!Number.isNaN(pageNumber)) setPage(Math.max(0, pageNumber));
    }

    try {
      const state = location.state as { scrollTop?: number } | null;
      if (state?.scrollTop && containerRef.current) {
        setTimeout(() => {
          try {
            if (containerRef.current) {
              containerRef.current.scrollTop = Number(state.scrollTop);
            }
          } catch {
            // ignore scroll restoration issues
          }
        }, 50);
      }
    } catch {
      // ignore invalid history state
    }

    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (clientFilter) params.set('client', clientFilter);
      if (sortBy) params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      params.set('page', String(page));
      setSearchParams(params, { replace: true });
      void refresh();
    }, 300);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [clientFilter, sortBy, sortDir, page, setSearchParams, refresh]);

  useEffect(() => {
    if (refreshNonce > 0) {
      void refresh();
    }
  }, [refreshNonce, refresh]);

  const clientOptions = Array.from(new Set(instances.map((instance) => instance.client).filter(Boolean) as string[]));
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const groupedInstances = instances.reduce<Array<{ client: string; environments: EnvInstance[] }>>((groups, environment) => {
    const clientName = environment.client?.trim() || 'Unassigned client';
    const existingGroup = groups.find((group) => group.client === clientName);

    if (existingGroup) {
      existingGroup.environments.push(environment);
    } else {
      groups.push({ client: clientName, environments: [environment] });
    }

    return groups;
  }, []);

  const toggleClient = (client: string) => {
    setExpandedClients((state) => ({
      ...state,
      [client]: !state[client],
    }));
  };

  const handleDelete = (environment: EnvInstance) => {
    setConfirmState({
      open: true,
      title: 'Delete environment',
      message: `Delete "${environment.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        setDeletingId(environment.id);
        try {
          await deleteEnvironment(msalInstance, environment.id);
          enqueueSnackbar('Environment deleted', { variant: 'success' });

          if (instances.length === 1 && page > 0) {
            setPage((currentPage) => Math.max(0, currentPage - 1));
          } else {
            await refresh();
          }
        } catch (error) {
          enqueueSnackbar(error instanceof Error ? error.message : 'Failed to delete environment.', { variant: 'error' });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <div className="space-y-5">
      <section className="ui-panel rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-[240px] flex-1 max-w-md">
                <SearchableSelect
                  options={clientOptions}
                  value={clientFilter}
                  onChange={(value) => {
                    setClientFilter(value || undefined);
                    setPage(0);
                  }}
                  placeholder="Filter clients..."
                  maxVisible={10}
                />
              </div>
              <button
                type="button"
                className={`${secondaryClass} rounded-lg px-3 py-2 text-sm`}
                onClick={() => {
                  setClientFilter(undefined);
                  setSortBy('name');
                  setSortDir('asc');
                  setPage(0);
                }}
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
              <select
                value={sortBy || ''}
                onChange={(event) => {
                  setSortBy(event.target.value || undefined);
                  setPage(0);
                }}
                className={`${themeClasses.select} rounded-lg px-3 py-2 text-sm`}
                aria-label="Sort environments by"
              >
                <option value="name">Sort by name</option>
                <option value="client">Sort by client</option>
                <option value="region">Sort by region</option>
              </select>

              <button
                type="button"
                className={`${secondaryClass} inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm`}
                onClick={() => {
                  setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'));
                  setPage(0);
                }}
                aria-label={`Sort direction ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDir === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {loadError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Failed to load environments. {loadError}
        </div>
      ) : null}

      {!loading && instances.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] px-5 py-10 text-center">
          <div className="text-base font-medium text-[var(--text-primary)]">No environments match the current filters.</div>
          <p className="mt-2 text-sm ui-text-muted">Try a different client filter or clear the current view.</p>
        </div>
      ) : instances.length > 0 ? (
        <div ref={containerRef} className="space-y-3">
          {groupedInstances.map((group) => (
            <section key={group.client} className="space-y-3">
              {(() => {
                const summary = summarizeClient(group.environments);
                const isExpanded = expandedClients[group.client] === true;

                return (
                  <button
                    type="button"
                    onClick={() => toggleClient(group.client)}
                    className="flex w-full items-start justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-3 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${group.client}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-panel-muted)] text-[var(--text-secondary)] transition ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </span>
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                          {group.client}
                        </h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                          <span>
                            {group.environments.length} environment{group.environments.length === 1 ? '' : 's'}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            {summary.running} running
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            {summary.stopped} stopped
                          </span>
                          {(summary.starting > 0 || summary.stopping > 0) ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-amber-400" />
                              {summary.starting + summary.stopping} changing
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)]">{isExpanded ? 'Hide' : 'Show'}</span>
                  </button>
                );
              })()}

              {expandedClients[group.client] === true ? (
                <div className="ml-4 space-y-3 rounded-[1.75rem] border border-[var(--border-subtle)] bg-[var(--surface-panel-muted)]/50 p-3 md:ml-6 md:p-4">
                  {group.environments.map((env) => (
                    <article
                      key={env.id}
                      className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-5 py-3.5 shadow-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-elevated)]"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              className="truncate text-left text-[15px] font-semibold tracking-tight text-[var(--text-primary)] transition hover:text-[var(--accent-primary)]"
                              onClick={() =>
                                navigate(`/environment/${env.id}${location.search}`, {
                                  state: { scrollTop: containerRef.current?.scrollTop || 0, selectedId: env.id },
                                })
                              }
                            >
                              {env.name}
                            </button>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                            {env.region ? (
                              <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[var(--text-secondary)]">
                                Region {env.region}
                              </span>
                            ) : null}
                            <span className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-[var(--text-secondary)]">
                              {env.stages?.length || 0} stage{env.stages?.length === 1 ? '' : 's'}
                            </span>
                            {(env.stages || []).map((stage) => {
                              const tone = getStageStatusClasses(stage.status);

                              return (
                                <span
                                  key={stage.id}
                                  className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] opacity-85 ${tone.chip}`}
                                  title={`${stage.name}: ${stage.status}`}
                                >
                                  <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                                  <span>{stage.name}</span>
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <div className="flex items-center gap-2">
                            <div
                              className={[
                                'flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-1 py-1 shadow-sm',
                                'md:invisible md:max-w-0 md:translate-x-2 md:overflow-hidden md:border-transparent md:bg-transparent md:px-0 md:py-0 md:opacity-0 md:shadow-none md:pointer-events-none',
                                'md:group-hover:visible md:group-hover:max-w-[22rem] md:group-hover:translate-x-0 md:group-hover:border-[var(--border-subtle)] md:group-hover:bg-[var(--surface-elevated)] md:group-hover:px-1 md:group-hover:py-1 md:group-hover:opacity-100 md:group-hover:shadow-sm md:group-hover:pointer-events-auto',
                                'md:group-focus-within:visible md:group-focus-within:max-w-[22rem] md:group-focus-within:translate-x-0 md:group-focus-within:border-[var(--border-subtle)] md:group-focus-within:bg-[var(--surface-elevated)] md:group-focus-within:px-1 md:group-focus-within:py-1 md:group-focus-within:opacity-100 md:group-focus-within:shadow-sm md:group-focus-within:pointer-events-auto',
                              ].join(' ')}
                            >
                              <InventoryActionButton
                                label="Details"
                                icon={<Eye className="h-4 w-4" />}
                                onClick={() =>
                                  navigate(`/environment/${env.id}${location.search}`, {
                                    state: { scrollTop: containerRef.current?.scrollTop || 0, selectedId: env.id },
                                  })
                                }
                              />
                              {canEdit ? (
                                <InventoryActionButton
                                  label="Edit"
                                  icon={<PencilLine className="h-4 w-4" />}
                                  onClick={() =>
                                    navigate(`/environment/edit/${env.id}${location.search}`, {
                                      state: { scrollTop: containerRef.current?.scrollTop || 0, selectedId: env.id },
                                    })
                                  }
                                />
                              ) : null}
                              {canEdit ? (
                                <InventoryActionButton
                                  label={deletingId === env.id ? 'Deleting...' : 'Delete'}
                                  icon={<Trash2 className="h-4 w-4" />}
                                  onClick={() => handleDelete(env)}
                                  disabled={deletingId === env.id}
                                  destructive
                                />
                              ) : null}
                            </div>

                            <button
                              type="button"
                              className={`${themeClasses.iconButton} inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)]`}
                              aria-label={`Actions for ${env.name}`}
                              title="Show actions"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm ui-text-muted">
          Showing {instances.length} of {total} environments
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 0}
            className={`${secondaryClass} rounded-lg px-3 py-1.5 text-sm disabled:opacity-50`}
            onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
          >
            Previous
          </button>
          <div className="text-sm text-[var(--text-secondary)]">
            Page {page + 1} of {pageCount}
          </div>
          <button
            type="button"
            disabled={(page + 1) * perPage >= total}
            className={`${secondaryClass} rounded-lg px-3 py-1.5 text-sm disabled:opacity-50`}
            onClick={() => setPage((currentPage) => currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>

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
    </div>
  );
}
