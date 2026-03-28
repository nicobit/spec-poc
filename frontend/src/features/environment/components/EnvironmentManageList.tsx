import { useCallback, useEffect, useRef, useState } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { EnvInstance, listEnvironments } from '../api';
import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';
import SearchableSelect from '@/components/SearchableSelect';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

type Props = { instance: IPublicClientApplication };

export default function EnvironmentManageList({ instance: msalInstance }: Props) {
  const [instances, setInstances] = useState<EnvInstance[]>([]);
  const [page, setPage] = useState(0);
  const [perPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
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
    try {
      const resp = await listEnvironments(msalInstance, { page, perPage, client: clientFilter, sortBy, sortDir });
      setInstances(resp.environments);
      setTotal(resp.total);
    } catch (err) {
      // swallow for now
    } finally {
      setLoading(false);
    }
  }, [msalInstance, page, perPage, clientFilter, sortBy, sortDir]);

  // initialize state from URL search params on mount
  useEffect(() => {
    const p = Object.fromEntries([...searchParams.entries()].map(([k, v]) => [k, v]));
    if (p.client) setClientFilter(p.client as string);
    if (p.sortBy) setSortBy(p.sortBy as string);
    if (p.sortDir && (p.sortDir === 'asc' || p.sortDir === 'desc')) setSortDir(p.sortDir as 'asc' | 'desc');
    if (p.page) {
      const pn = Number(p.page);
      if (!Number.isNaN(pn)) setPage(Math.max(0, pn));
    }
    // restore scroll position if provided via history state
    try {
      const state = location.state as any;
      if (state && state.scrollTop && containerRef.current) {
        setTimeout(() => {
          try { containerRef.current!.scrollTop = Number(state.scrollTop); } catch { /* no-op */ }
        }, 50);
      }
    } catch {
      // ignore
    }
    // refresh once after syncing from URL
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep URL in sync with current filters/paging/sort, debounced to avoid spamming history
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Manage Environments</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4">
            <SearchableSelect
              options={instances.map((i) => i.client).filter(Boolean) as string[]}
              value={clientFilter}
              onChange={(v) => { setClientFilter(v || undefined); setPage(0); void refresh(); }}
              placeholder="Filter clients..."
              maxVisible={10}
            />
            {/* type filter removed (now derived from stages) */}
            <select value={sortBy || ''} onChange={(e) => { setSortBy(e.target.value || undefined); setPage(0); }} className={`${themeClasses.select} rounded px-2 py-1 text-sm`}>
              <option value="name">Name</option>
              {/* Type removed */}
              <option value="client">Client</option>
              <option value="region">Region</option>
            </select>
            <button className={`${secondaryClass} rounded px-2 py-1 text-sm`} onClick={() => { setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')); setPage(0); }}>{sortDir === 'asc' ? '↑' : '↓'}</button>
            <button className={`${themeClasses.buttonPrimary} rounded px-2 py-1 text-sm ml-2`} onClick={() => { setPage(0); void refresh(); }}>Apply</button>
            <button className={`${secondaryClass} rounded px-2 py-1 text-sm`} onClick={() => { setClientFilter(undefined); setPage(0); void refresh(); }}>Clear</button>
          </div>
          {canEdit ? (
            <button className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`} onClick={() => navigate('/environment/create')}>
              New environment
            </button>
          ) : null}
          <button className={`${secondaryClass} rounded px-2 py-1 text-sm`} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading environments...</div>
      ) : (
        <div ref={containerRef} className="space-y-3 overflow-auto" style={{ maxHeight: '65vh' }}>
          {instances.map((env) => (
            <div key={env.id} className="rounded-2xl border border-[var(--border-subtle)] p-4 flex items-center justify-between">
              <div>
                <div className="font-medium text-[var(--text-primary)]">{env.name}</div>
                <div className="text-sm ui-text-muted">{[env.region, env.client].filter(Boolean).join(' | ')}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`${secondaryClass} rounded px-3 py-1 text-sm`}
                  onClick={() => navigate(`/environment/${env.id}${location.search}`, { state: { scrollTop: containerRef.current?.scrollTop || 0, selectedId: env.id } })}
                >
                  Details
                </button>
                {canEdit ? (
                  <button className={`${secondaryClass} rounded px-3 py-1 text-sm`} onClick={() => navigate(`/environment/edit/${env.id}${location.search}`, { state: { scrollTop: containerRef.current?.scrollTop || 0, selectedId: env.id } })}>Edit</button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit is now a full page at /environment/:id/edit */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm ui-text-muted">Showing {instances.length} of {total}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 0} className={`${secondaryClass} rounded px-2 py-1 text-sm`} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
          <div className="text-sm">Page {page + 1}</div>
          <button disabled={(page + 1) * perPage >= total} className={`${secondaryClass} rounded px-2 py-1 text-sm`} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}
