import React, { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Trash2, RefreshCw, Radio, ChevronDown, ChevronRight, CalendarClock } from 'lucide-react';
import { authFetch, apiUrl } from '@/shared/api/client';
import { themeClasses } from '@/theme/themeClasses';

interface Props {
  widget?: any;
  config?: any;
  onConfigChange?: (config: any) => void;
  editMode?: boolean;
  registerEditorOpener?: (fn: () => void) => void;
  registerHeaderAction?: (fn: () => React.ReactNode) => void;
}

type ScheduleKind = 'start' | 'stop' | 'both' | null;

interface StageServiceSummary {
  stageId: string;
  stageName?: string;
  running: number;
  stopped: number;
  unknown: number;
  total: number;
  checking: boolean;
  scheduleKind: ScheduleKind;
}

interface EnvItem {
  id: string;
  name?: string;
  status?: string;
  lastChecked?: string;
  owner?: string;
  stageSummaries: StageServiceSummary[];
}

function classifyServiceStatus(status: string | undefined | null): 'running' | 'stopped' | 'unknown' {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (['running', 'succeeded', 'starting', 'started', 'up', 'online', 'active'].some((k) => s.includes(k))) return 'running';
  if (['stopped', 'deallocated', 'stopping', 'down', 'offline', 'failed', 'disabled'].some((k) => s.includes(k))) return 'stopped';
  return 'unknown';
}

function countServices(services: any[]): { running: number; stopped: number; unknown: number; total: number } {
  let running = 0; let stopped = 0; let unknown = 0;
  for (const svc of services) {
    const c = classifyServiceStatus(svc?.status);
    if (c === 'running') running++;
    else if (c === 'stopped') stopped++;
    else unknown++;
  }
  return { running, stopped, unknown, total: services.length };
}

export default function EnvStatusWidget({ widget, config, onConfigChange, editMode, registerEditorOpener, registerHeaderAction }: Props) {
  const { instance } = useMsal();

  // ── card state ──────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<any[]>(() => config?.selections || []);
  const [items, setItems] = useState<EnvItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── editor state ─────────────────────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name?: string }>>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [editorClientId, setEditorClientId] = useState<string>('');
  const [editorClientName, setEditorClientName] = useState<string>('');
  const [envDetails, setEnvDetails] = useState<Array<{ id: string; name?: string; stages: Array<{ id: string; name?: string }> }>>([]);
  const [envDetailsLoading, setEnvDetailsLoading] = useState(false);
  const [editorSelections, setEditorSelections] = useState<any[]>([]);
  const [expandedEnvIds, setExpandedEnvIds] = useState<Set<string>>(new Set());

  // ── card logic ────────────────────────────────────────────────────────────
  const fetchStageSummaries = async (
    stageIds: string[],
    stageNameMap: Record<string, string>,
    scheduleKindMap: Record<string, ScheduleKind>,
  ): Promise<StageServiceSummary[]> => {
    if (!stageIds.length) return [];
    return Promise.all(
      stageIds.map(async (stageId) => {
        try {
          const res = await authFetch(instance, apiUrl(`/stages/${encodeURIComponent(stageId)}/azure-services`));
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const counts = countServices(data.services || []);
          return { stageId, stageName: stageNameMap[stageId] ?? stageId, ...counts, checking: false, scheduleKind: scheduleKindMap[stageId] ?? null };
        } catch {
          return { stageId, stageName: stageNameMap[stageId] ?? stageId, running: 0, stopped: 0, unknown: 0, total: 0, checking: false, scheduleKind: scheduleKindMap[stageId] ?? null };
        }
      }),
    );
  };

  const buildScheduleKindMap = async (
    stageIds: string[],
    stageNameMap: Record<string, string>,
  ): Promise<Record<string, ScheduleKind>> => {
    try {
      const res = await authFetch(instance, apiUrl('/environments/schedules'));
      if (!res.ok) return {};
      const data = await res.json();
      const stageSet = new Set(stageIds);
      // Reverse map: stage name (lower) → stage id, for fallback matching
      const nameToId: Record<string, string> = {};
      for (const [sid, sname] of Object.entries(stageNameMap)) {
        if (sname) nameToId[sname.toLowerCase()] = sid;
      }
      const actions: Record<string, Set<string>> = {};
      for (const sched of (data.schedules || [])) {
        // Accept both snake_case stage_id and legacy camelCase stageId
        const sid: string | undefined = sched.stage_id || sched.stageId || undefined;
        const action: string | undefined = sched.action || undefined;
        let resolvedId: string | undefined;
        if (sid && stageSet.has(sid)) {
          resolvedId = sid;
        } else if (!sid) {
          // Fall back to matching by stage name
          const stageName: string | undefined = sched.stage || undefined;
          if (stageName) resolvedId = nameToId[stageName.toLowerCase()];
        }
        if (resolvedId && action) {
          if (!actions[resolvedId]) actions[resolvedId] = new Set();
          actions[resolvedId].add(action);
        }
      }
      const map: Record<string, ScheduleKind> = {};
      for (const [sid, acts] of Object.entries(actions)) {
        const hasStart = acts.has('start');
        const hasStop = acts.has('stop');
        map[sid] = hasStart && hasStop ? 'both' : hasStart ? 'start' : 'stop';
      }
      return map;
    } catch {
      return {};
    }
  };

  const fetchDetails = async (sels: any[]) => {
    if (sels.length === 0) { setItems([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    // Collect all stage IDs across all selections to build schedule map in one call.
    // First fetch environment details to get stage name maps needed for name-based fallback.
    const allStageIds = Array.from(new Set(sels.flatMap((sel: any) => (sel.stageIds || []).filter(Boolean))));
    // Build a combined stageId→name map from env detail fetches (run in parallel)
    const envDataCache: Record<string, any> = {};
    await Promise.all(sels.map(async (sel: any) => {
      try {
        const res = await authFetch(instance, apiUrl(`/environments/${encodeURIComponent(sel.envId)}`));
        if (res.ok) envDataCache[sel.envId] = await res.json();
      } catch { /* skip */ }
    }));
    const combinedStageNameMap: Record<string, string> = {};
    for (const envData of Object.values(envDataCache)) {
      for (const st of (envData.stages || [])) { if (st.id) combinedStageNameMap[st.id] = st.name ?? st.id; }
    }
    const scheduleKindMap = await buildScheduleKindMap(allStageIds, combinedStageNameMap);
    const results: EnvItem[] = [];
    await Promise.all(
      sels.map(async (sel: any) => {
        const id = sel.envId;
        try {
          const data = envDataCache[id];
          if (!data) throw new Error('no data');
          const stageNameMap: Record<string, string> = {};
          for (const st of (data.stages || [])) { if (st.id) stageNameMap[st.id] = st.name ?? st.id; }
          const stageIds: string[] = (sel.stageIds || []).filter(Boolean);
          const stageSummaries = await fetchStageSummaries(stageIds, stageNameMap, scheduleKindMap);
          results.push({ id, name: data.name ?? sel.envName ?? id, status: data.status, lastChecked: data.lastChecked, owner: data.owner, stageSummaries });
        } catch {
          const stageIds: string[] = (sel.stageIds || []).filter(Boolean);
          const stageSummaries = await fetchStageSummaries(stageIds, {}, scheduleKindMap);
          results.push({ id, name: sel.envName ?? id, status: 'Unknown', stageSummaries });
        }
      }),
    );
    setItems(results);
    setLoading(false);
  };

  const handleRefresh = () => { void fetchDetails(selections); };

  const liveCheckStage = async (envId: string, stageId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id !== envId ? item : {
          ...item,
          stageSummaries: item.stageSummaries.map((s) => s.stageId === stageId ? { ...s, checking: true } : s),
        },
      ),
    );
    try {
      const res = await authFetch(instance, apiUrl(`/stages/${encodeURIComponent(stageId)}/azure-services?realtime=true`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const counts = countServices(data.services || []);
      setItems((prev) =>
        prev.map((item) =>
          item.id !== envId ? item : {
            ...item,
            stageSummaries: item.stageSummaries.map((s) => s.stageId === stageId ? { ...s, ...counts, checking: false } : s),
          },
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id !== envId ? item : {
            ...item,
            stageSummaries: item.stageSummaries.map((s) => s.stageId === stageId ? { ...s, checking: false } : s),
          },
        ),
      );
    }
  };

  useEffect(() => {
    const next = config?.selections || [];
    setSelections(next);
    void fetchDetails(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  // ── editor logic ──────────────────────────────────────────────────────────
  const loadEnvsForClient = async (clientId: string) => {
    setEnvDetailsLoading(true);
    setEnvDetails([]);
    try {
      const res = await authFetch(instance, apiUrl(`/environments?client=${encodeURIComponent(clientId)}&per_page=100`));
      const json = await res.json();
      setEnvDetails(
        (json.environments || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          stages: (e.stages || []).map((s: any) => ({ id: s.id, name: s.name ?? s.id })),
        })),
      );
    } catch {
      setEnvDetails([]);
    } finally {
      setEnvDetailsLoading(false);
    }
  };

  const openEditor = async () => {
    setEditorSelections(config?.selections || []);
    setEditorClientId(config?.clientId || '');
    setEditorClientName(config?.clientName || '');
    setExpandedEnvIds(new Set());
    setEditorOpen(true);
    setClientLoading(true);
    try {
      const res = await authFetch(instance, apiUrl('/clients?per_page=200'));
      const json = await res.json();
      setClientOptions((json.clients || []).map((c: any) => ({ id: c.id, name: c.name })));
    } catch {
      setClientOptions([]);
    } finally {
      setClientLoading(false);
    }
    if (config?.clientId) { await loadEnvsForClient(config.clientId); }
  };

  useEffect(() => {
    if (registerEditorOpener) registerEditorOpener(openEditor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerEditorOpener]);

  const handleClientChange = async (clientId: string) => {
    const found = clientOptions.find((c) => c.id === clientId);
    setEditorClientId(clientId);
    setEditorClientName(found?.name ?? clientId);
    setEditorSelections([]);
    setExpandedEnvIds(new Set());
    if (clientId) { await loadEnvsForClient(clientId); }
  };

  const toggleEnv = (env: { id: string; name?: string; stages: Array<{ id: string; name?: string }> }) => {
    const already = editorSelections.find((s: any) => s.envId === env.id);
    if (already) {
      setEditorSelections((prev) => prev.filter((s: any) => s.envId !== env.id));
    } else {
      setEditorSelections((prev) => [
        ...prev,
        { envId: env.id, envName: env.name ?? env.id, stageIds: env.stages.map((s) => s.id) },
      ]);
      setExpandedEnvIds((prev) => new Set([...prev, env.id]));
    }
  };

  const toggleEditorStage = (envId: string, stageId: string) => {
    setEditorSelections((prev) =>
      prev.map((sel: any) => {
        if (sel.envId !== envId) return sel;
        const has = (sel.stageIds || []).includes(stageId);
        return { ...sel, stageIds: has ? sel.stageIds.filter((x: string) => x !== stageId) : [...(sel.stageIds || []), stageId] };
      }),
    );
  };

  const toggleExpand = (envId: string) => {
    setExpandedEnvIds((prev) => {
      const next = new Set(prev);
      if (next.has(envId)) next.delete(envId); else next.add(envId);
      return next;
    });
  };

  const saveConfig = () => {
    onConfigChange?.({ ...(config || {}), clientId: editorClientId, clientName: editorClientName, selections: editorSelections });
    setEditorOpen(false);
  };

  useEffect(() => {
    if (registerHeaderAction) {
      registerHeaderAction(() =>
        !editMode ? (
          <span role="button" onClick={handleRefresh} className={`${themeClasses.iconButton} rounded p-0.5`} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </span>
        ) : null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registerHeaderAction, editMode]);

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-full p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs text-[var(--text-secondary)]">{config?.clientName || ''}</div>
        {!registerHeaderAction ? (
          <button className={`${themeClasses.iconButton} rounded p-0.5`} title="Refresh" onClick={handleRefresh}><RefreshCw className="h-4 w-4" /></button>
        ) : <div />}
      </div>

      {loading ? <div className="mt-4 text-[var(--text-secondary)]">Loading...</div> : null}
      {error ? <div className="mt-2 text-red-400">{error}</div> : null}
      {!loading && items.length === 0 ? <div className="mt-4 text-[var(--text-secondary)]">No environments configured.</div> : null}

      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="ui-panel rounded-xl p-3">
            <div className="flex items-center space-x-3">
              <span className={`h-3 w-3 flex-shrink-0 rounded-full ${it.status === 'Up' ? 'bg-green-500' : it.status === 'Degraded' ? 'bg-amber-400' : 'bg-red-500'}`} />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-[var(--text-primary)]">{it.name || it.id}</div>
                <div className="text-[var(--text-secondary)] text-sm">{it.owner || ''}{it.owner && it.lastChecked ? ' • ' : ''}{it.lastChecked ? new Date(it.lastChecked).toLocaleString() : ''}</div>
              </div>
            </div>
            {it.stageSummaries.length > 0 ? (
              <ul className="mt-2 space-y-1 pl-6">
                {it.stageSummaries.map((ss) => (
                  <li key={ss.stageId} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-[var(--text-secondary)] truncate">
                      {ss.stageName}
                      {ss.scheduleKind === 'start' && (
                        <span title="Scheduled to start" className="flex-shrink-0 text-green-500"><CalendarClock className="h-4 w-4" /></span>
                      )}
                      {ss.scheduleKind === 'stop' && (
                        <span title="Scheduled to stop" className="flex-shrink-0 text-red-400"><CalendarClock className="h-4 w-4" /></span>
                      )}
                      {ss.scheduleKind === 'both' && (
                        <>
                          <span title="Scheduled to start" className="flex-shrink-0 text-green-500"><CalendarClock className="h-4 w-4" /></span>
                          <span title="Scheduled to stop" className="flex-shrink-0 text-red-400"><CalendarClock className="h-4 w-4" /></span>
                        </>
                      )}
                      {ss.scheduleKind === null && (
                        <span title="No schedule defined" className="flex-shrink-0 text-[var(--text-secondary)] opacity-40"><CalendarClock className="h-4 w-4" /></span>
                      )}
                    </span>
                    <div className="ml-2 flex flex-shrink-0 items-center space-x-2">
                      {ss.checking ? (
                        <span className="text-xs text-[var(--text-secondary)] animate-pulse">checking…</span>
                      ) : ss.total > 0 ? (
                        <span className="text-xs">
                          {ss.running > 0 ? <span className="text-green-500">{ss.running} running</span> : null}
                          {ss.running > 0 && (ss.stopped > 0 || ss.unknown > 0) ? <span className="text-[var(--text-secondary)]">{' · '}</span> : null}
                          {ss.stopped > 0 ? <span className="text-red-400">{ss.stopped} stopped</span> : null}
                          {ss.stopped > 0 && ss.unknown > 0 ? <span className="text-[var(--text-secondary)]">{' · '}</span> : null}
                          {ss.unknown > 0 ? <span className="text-amber-400">{ss.unknown} unknown</span> : null}
                          {ss.running === 0 && ss.stopped === 0 && ss.unknown === 0 ? <span className="text-[var(--text-secondary)]">no data</span> : null}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">no services</span>
                      )}
                      <button
                        title="Check current status directly on the service"
                        disabled={ss.checking}
                        onClick={() => liveCheckStage(it.id, ss.stageId)}
                        className={`${themeClasses.iconButton} rounded p-0.5 ${ss.checking ? 'opacity-40' : ''}`}
                      >
                        <Radio className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>

      {/* ── editor modal ── */}
      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditorOpen(false)} />
          <div className="ui-panel z-10 flex w-full max-w-2xl flex-col rounded-2xl" style={{ maxHeight: '85vh' }}>
            <div className="flex-shrink-0 border-b border-[var(--border)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Configure Environment Widget</h2>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Client selection */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)]">Client</label>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">Select one client to monitor</p>
                {clientLoading ? (
                  <div className="mt-2 text-sm text-[var(--text-secondary)]">Loading clients…</div>
                ) : (
                  <select
                    className={`${themeClasses.field} mt-2 w-full`}
                    value={editorClientId}
                    onChange={(e) => { void handleClientChange(e.target.value); }}
                  >
                    <option value="">— Choose a client —</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>{c.name || c.id}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Environment + stage tree */}
              {editorClientId ? (
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-[var(--text-primary)]">Environments &amp; Stages</label>
                    {editorSelections.length > 0 ? (
                      <span className="text-xs text-[var(--text-secondary)]">{editorSelections.length} selected</span>
                    ) : null}
                  </div>

                  {envDetailsLoading ? (
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">Loading environments…</div>
                  ) : envDetails.length === 0 ? (
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">No environments found for this client.</div>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {envDetails.map((env) => {
                        const sel = editorSelections.find((s: any) => s.envId === env.id);
                        const checked = Boolean(sel);
                        const expanded = expandedEnvIds.has(env.id);
                        const selectedStageIds: string[] = sel?.stageIds || [];
                        return (
                          <li key={env.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
                            <div className="flex items-center space-x-2 px-3 py-2">
                              <input
                                type="checkbox"
                                id={`env-${env.id}`}
                                checked={checked}
                                onChange={() => toggleEnv(env)}
                                className="h-4 w-4 flex-shrink-0"
                              />
                              <label htmlFor={`env-${env.id}`} className="flex-1 cursor-pointer font-medium text-sm text-[var(--text-primary)]">
                                {env.name || env.id}
                              </label>
                              {env.stages.length > 0 ? (
                                <button
                                  onClick={() => toggleExpand(env.id)}
                                  className={`${themeClasses.iconButton} rounded p-0.5`}
                                  title={expanded ? 'Collapse stages' : 'Expand stages'}
                                >
                                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              ) : null}
                            </div>

                            {expanded && env.stages.length > 0 ? (
                              <div className="border-t border-[var(--border)] bg-[var(--surface-secondary,var(--surface))] px-3 py-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-medium text-[var(--text-secondary)]">Stages</span>
                                  {checked ? (
                                    <div className="flex space-x-3 text-xs text-[var(--text-secondary)]">
                                      <button
                                        className="hover:text-[var(--text-primary)] underline"
                                        onClick={() =>
                                          setEditorSelections((prev) =>
                                            prev.map((s: any) => s.envId === env.id ? { ...s, stageIds: env.stages.map((st) => st.id) } : s),
                                          )
                                        }
                                      >
                                        All
                                      </button>
                                      <button
                                        className="hover:text-[var(--text-primary)] underline"
                                        onClick={() =>
                                          setEditorSelections((prev) =>
                                            prev.map((s: any) => s.envId === env.id ? { ...s, stageIds: [] } : s),
                                          )
                                        }
                                      >
                                        None
                                      </button>
                                    </div>
                                  ) : null}
                                </div>
                                <ul className="grid grid-cols-2 gap-1">
                                  {env.stages.map((st) => (
                                    <li key={st.id}>
                                      <label className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selectedStageIds.includes(st.id)}
                                          disabled={!checked}
                                          onChange={() => toggleEditorStage(env.id, st.id)}
                                          className="h-3.5 w-3.5"
                                        />
                                        <span className={`text-sm ${!checked ? 'opacity-40' : ''} truncate`}>{st.name || st.id}</span>
                                      </label>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex-shrink-0 flex justify-end space-x-2 border-t border-[var(--border)] px-6 py-4">
              <button onClick={() => setEditorOpen(false)} className={`${themeClasses.buttonSecondary} rounded px-4 py-2`}>Cancel</button>
              <button onClick={saveConfig} className={`${themeClasses.buttonPrimary} rounded px-4 py-2`}>Save</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
