import { useEffect, useState } from 'react';
import { X, RefreshCcw, ServerCog, Zap } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

import { themeClasses } from '@/theme/themeClasses';

type StageServices = {
  services?: Array<{ name: string; type?: string; id?: string }>;
  schedules?: Array<any>;
  recentFailures?: Array<any>;
};

export default function StageServicesPanel({}: {}) {
  const [open, setOpen] = useState(true);
  const [stageId, setStageId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('environmentId') || params.get('environmentName');
    } catch {
      return null;
    }
  });
  const [realtime, setRealtime] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<StageServices | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = async (id: string, live: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (live) qs.set('realtime', 'true');
      const url = `/api/stages/${encodeURIComponent(id)}/azure-services${qs.toString() ? `?${qs.toString()}` : ''}`;
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || res.statusText);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stageId) void fetchServices(stageId, realtime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId, realtime]);

  if (!open) return null;

  return (
    <div className="absolute right-4 top-14 z-50 w-96 rounded-lg border bg-white p-3 shadow-lg dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ServerCog className="h-4 w-4 text-[var(--text-primary)]" />
          <div className="text-sm font-semibold">Stage services</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Refresh"
            className={`${themeClasses.iconButton} rounded-full p-1`}
            onClick={() => {
              if (stageId) void fetchServices(stageId, realtime);
            }}
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Close"
            className={`${themeClasses.iconButton} rounded-full p-1`}
            onClick={() => setOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        <label className="text-xs text-[var(--text-muted)]">Stage id</label>
        <div className="mt-1 flex gap-2">
          <input
            value={stageId ?? ''}
            onChange={(e) => setStageId(e.target.value || null)}
            placeholder="Enter stage id or environment id"
            className="flex-1 rounded border px-2 py-1 text-sm"
          />
          <label className="inline-flex items-center gap-2 text-xs">
            <input type="checkbox" checked={realtime} onChange={(e) => setRealtime(e.target.checked)} /> Live
          </label>
        </div>
      </div>

      <div className="mt-3 max-h-64 overflow-auto text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--text-muted)]">
            <Zap className="h-4 w-4 animate-pulse" /> Loading...
          </div>
        ) : error ? (
          <div className="text-[var(--status-error-text)]">{error}</div>
        ) : data ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold">Services</div>
              {data.services && data.services.length > 0 ? (
                <ul className="list-disc pl-5">
                  {data.services.map((s, i) => (
                    <li key={i} className="truncate">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">{s.type || s.id}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-[var(--text-muted)]">No services found.</div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold">Schedules</div>
              {data.schedules && data.schedules.length > 0 ? (
                <div className="text-xs text-[var(--text-muted)]">
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(JSON.stringify(data.schedules, null, 2))) }} />
                </div>
              ) : (
                <div className="text-xs text-[var(--text-muted)]">No schedules found.</div>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold">Recent failures</div>
              {data.recentFailures && data.recentFailures.length > 0 ? (
                <ul className="list-disc pl-5 text-xs text-[var(--text-muted)]">
                  {data.recentFailures.map((f, idx) => (
                    <li key={idx}>
                      <div className="font-medium">{f.action || f.error || 'failure'}</div>
                      <div className="text-xs">{f.timestamp || f.time || ''}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-[var(--text-muted)]">No recent failures.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-[var(--text-muted)]">Enter a stage id and click refresh to load data.</div>
        )}
      </div>
    </div>
  );
}
