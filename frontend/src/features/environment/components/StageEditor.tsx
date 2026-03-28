import React, { useEffect, useState, useRef } from 'react';
import { EnvironmentStage } from '../api';
import { themeClasses } from '@/theme/themeClasses';
import { enqueueSnackbar } from 'notistack';
import { useLocation, useNavigate } from 'react-router-dom';

type Props = {
  stages: EnvironmentStage[];
  onChange: (s: EnvironmentStage[]) => void;
};

function newStage(): EnvironmentStage {
  return {
    id: `stage-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`,
    name: 'New stage',
    status: 'stopped',
    resourceActions: [],
    notificationGroups: [],
    azureConfig: {},
  } as EnvironmentStage;
}

export default function StageEditor({ stages, onChange }: Props) {
  const [active, setActive] = React.useState(0);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const nameRef = useRef<HTMLInputElement | null>(null);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const updateStage = (idx: number, patch: Partial<EnvironmentStage>) => {
    const next = stages.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onChange(next);
  };

  const addStage = () => {
    const next = [...stages, newStage()];
    onChange(next);
    const idx = next.length - 1;
    setActive(idx);
    // focus will occur after render via effect
    // update URL
    try { const params = new URLSearchParams(location.search); params.set('stage', next[idx].id); navigate({ search: params.toString() }, { replace: true }); } catch (e) {}
  };

  const removeStage = (idx: number) => {
    const removed = stages[idx];
    const next = stages.filter((_, i) => i !== idx);
    onChange(next);
    if (active >= next.length) setActive(Math.max(0, next.length - 1));
    // show undo snackbar
    enqueueSnackbar('Stage removed', {
      variant: 'info',
      action: (key) => (
        // @ts-ignore - notistack action signature
        <button className="ui-button-secondary px-2 py-1 text-sm" onClick={() => {
          // restore
          const restored = [...next.slice(0, idx), removed, ...next.slice(idx)];
          onChange(restored);
          setActive(idx);
          // close snackbar
        }}>Undo</button>
      ),
      autoHideDuration: 6000,
    });
  };

  // drag-and-drop reordering using native HTML5 API
  const onDragStart = (e: React.DragEvent, idx: number) => {
    try {
      e.dataTransfer.setData('text/plain', String(idx));
      e.dataTransfer.effectAllowed = 'move';
    } catch (err) {}
  };

  const onDropTab = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    try {
      const from = Number(e.dataTransfer.getData('text/plain'));
      if (isNaN(from)) return;
      if (from === toIdx) return;
      const copy = [...stages];
      const [item] = copy.splice(from, 1);
      copy.splice(toIdx, 0, item);
      onChange(copy);
      setActive(toIdx);
    } catch (err) {}
  };

  // key/value editor helpers
  const toEntries = (obj: Record<string, any> | undefined) => {
    if (!obj) return [] as { k: string; v: string }[];
    return Object.entries(obj).map(([k, v]) => ({ k, v: typeof v === 'string' ? v : JSON.stringify(v) }));
  };

  const fromEntries = (entries: { k: string; v: string }[]) => {
    const out: Record<string, any> = {};
    for (const e of entries) {
      const key = (e.k || '').trim();
      if (!key) continue;
      const val = e.v || '';
      // try to parse JSON values, otherwise use string
      try {
        out[key] = JSON.parse(val);
      } catch (_err) {
        out[key] = val;
      }
    }
    return out;
  };

  const onAzureConfigChange = (idx: number, entries: { k: string; v: string }[]) => {
    const parsed = fromEntries(entries);
    updateStage(idx, { azureConfig: parsed });
  };

  // sync active stage from URL if provided
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const sid = params.get('stage');
      if (sid) {
        const idx = stages.findIndex((s) => s.id === sid);
        if (idx >= 0) setActive(idx);
      }
    } catch (e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // update URL when active changes
    try {
      const params = new URLSearchParams(location.search);
      const sid = stages[active]?.id;
      if (sid) params.set('stage', sid); else params.delete('stage');
      navigate({ search: params.toString() }, { replace: true });
    } catch (e) {}
    // focus input when active changes
    setTimeout(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
      // ensure tab visible
      const tabBtn = tabsRef.current?.querySelectorAll('button')[active] as HTMLElement | undefined;
      tabBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const activeStage = stages[active];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Stages</h3>
        <div className="flex items-center gap-2">
          <button className={`${themeClasses.buttonSecondary} text-sm px-2 py-1`} onClick={addStage}>Add stage</button>
        </div>
      </div>

      <div>
        <div>
          <div role="tablist" aria-label="Stages" className="hidden sm:flex flex-wrap gap-2 mb-3" ref={tabsRef}>
            {stages.map((s, idx) => {
              const hasError = !(s.name && s.name.trim());
              return (
                <button
                  key={s.id}
                  role="tab"
                  draggable
                  aria-selected={active === idx}
                  tabIndex={active === idx ? 0 : -1}
                  onClick={() => { setActive(idx); setEditIndex(null); }}
                  onDoubleClick={() => { setEditIndex(idx); setEditName(s.name || ''); }}
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => onDropTab(e, idx)}
                  className={`${active === idx ? 'bg-[var(--surface-panel)] text-[var(--text-primary)] border border-[var(--accent)] shadow-sm ring-1 ring-[var(--accent)]' : 'bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-hover)]'} px-3 py-1 rounded text-sm flex items-center gap-2 cursor-grab`}
                >
                  {editIndex === idx ? (
                    <input
                      ref={nameRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => { if (editIndex !== null) { updateStage(editIndex, { name: editName }); setEditIndex(null); } }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && editIndex !== null) { updateStage(editIndex, { name: editName }); setEditIndex(null); } }}
                      className={`${themeClasses.field} text-sm px-2 py-0.5`}
                    />
                  ) : (
                    <span>{s.name || 'New stage'}</span>
                  )}
                  {hasError ? <span className="text-xs text-red-400">•</span> : null}
                </button>
              );
            })}
          </div>

          {/* small screen: use select */}
          <div className="sm:hidden mb-3">
            <label className="sr-only">Select stage</label>
            <select value={stages[active]?.id || ''} className={`${themeClasses.select} w-full`} onChange={(e) => {
              const idx = stages.findIndex((s) => s.id === e.target.value);
              if (idx >= 0) setActive(idx);
            }}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name || 'New stage'}</option>)}
            </select>
          </div>
        </div>

        {activeStage ? (
          <div className="ui-panel p-3 rounded">
                <div className="flex items-start gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium">Stage name</label>
                <input ref={nameRef} aria-label="Stage name" className={`${themeClasses.field} mt-1 w-full`} value={activeStage.name} onChange={(e) => updateStage(active, { name: e.target.value })} />
                <label className="block text-sm font-medium mt-3">Resources</label>
                <ResourceActionsEditor
                  envIndex={active}
                  actions={activeStage.resourceActions || []}
                  onChangeActions={(actions) => updateStage(active, { resourceActions: actions })}
                />
              </div>
              <div className="shrink-0 flex flex-col gap-2">
                <button aria-label="Remove stage" className={`${themeClasses.buttonSecondary} px-2 py-1 text-sm`} onClick={() => removeStage(active)}>Remove</button>
                <div className="text-xs ui-text-muted mt-1">Drag tabs to reorder</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border-subtle)] px-4 py-8 text-sm ui-text-muted">No stages defined.</div>
        )}
      </div>
    </div>
  );
}

function ResourceActionsEditor({ envIndex, actions, onChangeActions }: { envIndex: number; actions: any[]; onChangeActions: (a: any[]) => void }) {
  const [local, setLocal] = useState(actions && actions.length ? actions : [] as any[]);

  useEffect(() => setLocal(actions && actions.length ? actions : []), [actions]);

  const update = (i: number, patch: Partial<any>) => {
    const next = local.map((it, idx) => (idx === i ? { ...it, ...patch } : it));
    setLocal(next);
    onChangeActions(next);
  };

  const add = () => {
    const next = [...local, { id: undefined, type: 'sql-vm' }];
    setLocal(next);
    onChangeActions(next);
  };

  const remove = (i: number) => {
    const next = local.filter((_, idx) => idx !== i);
    setLocal(next);
    onChangeActions(next);
  };

  return (
    <div className="space-y-2">
      {local.map((it, i) => (
        <div key={`${it.type}-${i}`} className="ui-panel p-2 rounded">
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <label className="block text-sm font-medium">Resource type</label>
              <select aria-label="Resource type" className={`${themeClasses.field} mt-1 w-full`} value={it.type} onChange={(e) => update(i, { type: e.target.value })}>
                <option value="sql-vm">SQL VM</option>
                <option value="sql-managed-instance">SQL Managed Instance</option>
                <option value="synapse-sql-pool">Synapse SQL Pool</option>
                <option value="service-bus-message">Service Bus (queue/topic)</option>
              </select>

              {it.type === 'service-bus-message' ? (
                <>
                  <label className="block text-sm font-medium mt-2">Service Bus namespace</label>
                  <input aria-label="Service Bus namespace" className={`${themeClasses.field} mt-1 w-full`} value={it.namespace || ''} onChange={(e) => update(i, { namespace: e.target.value })} />
                  <label className="block text-sm font-medium mt-2">Entity type</label>
                  <select aria-label="Service Bus entity type" className={`${themeClasses.field} mt-1 w-full`} value={it.queueOrTopic === 'topic' ? 'topic' : 'queue'} onChange={(e) => update(i, { queueOrTopic: e.target.value })}>
                    <option value="queue">Queue</option>
                    <option value="topic">Topic</option>
                  </select>
                  <label className="block text-sm font-medium mt-2">Entity name</label>
                  <input aria-label="Service Bus entity name" className={`${themeClasses.field} mt-1 w-full`} value={it.queueOrTopicName || it.queueName || it.topicName || ''} onChange={(e) => update(i, { queueOrTopicName: e.target.value })} />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium mt-2">Resource id</label>
                  <input aria-label="Resource id" className={`${themeClasses.field} mt-1 w-full font-mono`} value={it.id || ''} onChange={(e) => update(i, { id: e.target.value })} />
                </>
              )}
            </div>
            <div className="shrink-0 flex flex-col gap-2">
              <button aria-label="Remove resource" className={`${themeClasses.buttonSecondary} px-2 py-1 text-sm`} onClick={() => remove(i)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      <div>
        <button aria-label="Add resource" type="button" className={`${themeClasses.buttonSecondary} px-2 py-1 text-sm`} onClick={add}>Add resource</button>
      </div>
    </div>
  );
}
