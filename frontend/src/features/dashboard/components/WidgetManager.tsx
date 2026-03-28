import { useEffect, useReducer, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Check, Edit2, Edit3, Grid, Plus, X } from 'lucide-react';
import { v4 as uuid } from 'uuid';

import { TabConfig, WidgetType } from '@/types';
import { themeClasses } from '@/theme/themeClasses';
import ConfirmDialog from '@/components/ConfirmDialog';

import { loadDashboard, saveDashboard } from '../api/dashboard';
import DashboardTour from './DashboardTour';
import Palette from './Palette';
import WidgetGrid from './WidgetGrid';

interface State {
  tabs: TabConfig[];
  active: number;
}

type Action =
  | { type: 'SET'; tabs: TabConfig[] }
  | { type: 'PATCH_TAB'; index: number; patch: Partial<TabConfig> }
  | { type: 'ADD_TAB' }
  | { type: 'REMOVE_TAB'; index: number }
  | { type: 'SET_ACTIVE'; index: number };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET':
      return { ...state, tabs: action.tabs };
    case 'PATCH_TAB': {
      const next = [...state.tabs];
      next[action.index] = { ...next[action.index], ...action.patch };
      return { ...state, tabs: next };
    }
    case 'ADD_TAB': {
      const newTab: TabConfig = {
        id: uuid(),
        name: `Tab ${state.tabs.length + 1}`,
        widgets: [],
        layouts: { lg: [] },
      };
      return { ...state, tabs: [...state.tabs, newTab], active: state.tabs.length };
    }
    case 'REMOVE_TAB': {
      const remaining = state.tabs.filter((_, index) => index !== action.index);
      return { ...state, tabs: remaining, active: Math.max(0, state.active - 1) };
    }
    case 'SET_ACTIVE':
      return { ...state, active: action.index };
    default:
      return state;
  }
};

export default function WidgetManager() {
  const { instance } = useMsal();
  const [state, dispatch] = useReducer(reducer, { tabs: [], active: 0 });
  const [editMode, setEditMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [addType, setAddType] = useState<WidgetType | null>(null);
  const [renameIndex, setRenameIndex] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    (async () => {
      try {
        await instance.initialize();
        const tabs = await loadDashboard(instance);
        dispatch({
          type: 'SET',
          tabs: tabs || [{ id: uuid(), name: 'Home', widgets: [], layouts: { lg: [] } }],
        });
      } catch {
        dispatch({
          type: 'SET',
          tabs: [{ id: uuid(), name: 'Home', widgets: [], layouts: { lg: [] } }],
        });
      }
    })();
  }, [instance]);

  useEffect(() => {
    if (editMode) {
      const timeout = setTimeout(() => saveDashboard(instance, state.tabs).catch(console.error), 800);
      return () => clearTimeout(timeout);
    }
  }, [state.tabs, editMode, instance]);

  useEffect(() => {
    if (addType && state.tabs[state.active]) {
      const id = uuid();
      const newWidget = { id, type: addType };
      const tab = state.tabs[state.active];
      const yMax = tab.layouts.lg?.reduce((max, layout) => Math.max(max, layout.y + layout.h), 0) || 0;
      const layoutItem = { i: id, x: 0, y: yMax, w: 2, h: 3, minW: 1, minH: 2 };
      const layouts = Object.fromEntries(
        Object.entries(tab.layouts).map(([bp, arr]) => [bp, [...arr, layoutItem]]),
      ) as TabConfig['layouts'];
      dispatch({
        type: 'PATCH_TAB',
        index: state.active,
        patch: { widgets: [...tab.widgets, newWidget], layouts },
      });
      setAddType(null);
    }
  }, [addType, state.active, state.tabs]);

  const current = state.tabs[state.active];
  const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => Promise<void> }>(() => ({ open: false }));

  const openRename = (index: number) => {
    setRenameIndex(index);
    setRenameValue(state.tabs[index].name);
  };

  const saveRename = () => {
    if (renameIndex !== null) {
      dispatch({ type: 'PATCH_TAB', index: renameIndex, patch: { name: renameValue } });
      setRenameIndex(null);
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className="ui-panel flex rounded-2xl p-2"
        style={{ height: 'auto' }}
      >
        <div className="flex flex-wrap items-center gap-2">
          {state.tabs.map((tab, index) => {
            const active = index === state.active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  dispatch({ type: 'SET_ACTIVE', index });
                }}
                className={[
                  'flex items-center rounded-2xl border px-4 py-2 text-sm transition-colors',
                  active
                    ? 'ui-nav-item-active'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                <span>{tab.name}</span>
                {editMode && (
                  <span className="ml-2 flex items-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openRename(index);
                      }}
                      className={`no-drag ${themeClasses.iconButton} rounded p-1 focus:outline-none`}
                      style={{ cursor: 'pointer' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    {state.tabs.length > 1 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConfirmState({ open: true, title: 'Delete tab', message: 'Delete this tab?', onConfirm: async () => dispatch({ type: 'REMOVE_TAB', index }) });
                        }}
                        className={`ml-1 ${themeClasses.iconButton} rounded p-1 focus:outline-none`}
                        style={{ cursor: 'pointer' }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center space-x-3">
          {editMode && (
            <button
              onClick={() => dispatch({ type: 'ADD_TAB' })}
              title="Add tab"
              className={`${themeClasses.iconButton} rounded p-2 focus:outline-none`}
            >
              <Plus size={20} />
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            title={editMode ? 'Finish editing' : 'Edit layout'}
            className={`edit-toggle ${themeClasses.iconButton} rounded p-2 focus:outline-none`}
          >
            {editMode ? <Check size={20} /> : <Edit3 size={20} />}
          </button>
          {editMode && (
            <button
              onClick={() => setPaletteOpen(true)}
              title="Add widget"
              className={`add-widget ${themeClasses.iconButton} rounded p-2 focus:outline-none`}
            >
              <Grid size={20} />
            </button>
          )}
          <DashboardTour />
        </div>
      </div>

      <div className="h-full w-full flex-1 overflow-hidden">
        {current && (
          <WidgetGrid
            tab={current}
            editMode={editMode}
            clearAddRequest={() => setAddType(null)}
            onUpdate={(patch) => dispatch({ type: 'PATCH_TAB', index: state.active, patch })}
          />
        )}
      </div>

      <Palette open={paletteOpen} onClose={() => setPaletteOpen(false)} onAdd={(type) => setAddType(type)} />

      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={async () => {
        const h = confirmState.onConfirm;
        setConfirmState({ open: false });
        if (h) await h();
      }} onCancel={() => setConfirmState({ open: false })} />

      {renameIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRenameIndex(null)} />
          <div className="ui-panel z-10 w-full max-w-md rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Rename Tab</h2>
            <input
              autoFocus
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), saveRename())}
              className={`${themeClasses.field} mt-4 w-full rounded p-2`}
            />
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setRenameIndex(null)}
                className={`${themeClasses.buttonSecondary} rounded px-4 py-2 focus:outline-none`}
              >
                Cancel
              </button>
              <button
                onClick={saveRename}
                className={`${themeClasses.buttonPrimary} rounded px-4 py-2 focus:outline-none`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
