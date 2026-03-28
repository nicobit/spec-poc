import React, { Suspense } from 'react';
import { X } from 'lucide-react';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { themeClasses } from '@/theme/themeClasses';
import { getWidgetDefinition } from './registry';

interface Props {
  widget: { id: string; type: string };
  editMode: boolean;
  onRemove: () => void;
  layout: { i: string; x: number; y: number; w: number; h: number };
  onLayoutChange: (layout: { i: string; x: number; y: number; w: number; h: number }) => void;
}

const WidgetWrapper: React.FC<Props> = ({ widget, editMode, onRemove, layout }) => {
  const definition = getWidgetDefinition(widget.type);
  const Component = definition?.component;
  const title = definition?.title ?? widget.type;
  const icon = definition?.icon ?? null;

  return (
    <div
      className="relative h-full w-full"
      style={{
        gridArea: `${layout.y + 1} / ${layout.x + 1} / span ${layout.h} / span ${layout.w}`,
      }}
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden bg-clip-border text-[var(--text-secondary)] ${
          editMode ? 'drag-handle cursor-move' : 'cursor-default'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          {icon && <span className="mr-3 h-5 w-5">{icon}</span>}

          {editMode && (
            <button
              onClick={onRemove}
              className={`no-drag ${themeClasses.iconButton} rounded p-1 focus:outline-none`}
              aria-label="Remove widget"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {Component ? (
            <Suspense fallback={<div className="text-sm ui-text-muted">Loading widget...</div>}>
              <Component />
            </Suspense>
          ) : (
            <div className="text-sm ui-text-muted">Component not found</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WidgetWrapper;
