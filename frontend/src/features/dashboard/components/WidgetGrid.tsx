import { useCallback, useEffect, useState } from 'react';
import { Layout, Layouts, Responsive, WidthProvider } from 'react-grid-layout';
import { Move } from 'lucide-react';
import { v4 as uuid } from 'uuid';

import { TabConfig, WidgetType } from '@/types';
import WidgetWrapper from '@/shared/widgets/WidgetWrapper';
import ConfirmDialog from '@/components/ConfirmDialog';

const ResponsiveGridLayout = WidthProvider(Responsive);
const breakpoints = { lg: 1200, md: 996, sm: 768 } as const;
const cols = { lg: 12, md: 12, sm: 12 } as const;

type BP = keyof typeof breakpoints;

interface Props {
  tab: TabConfig;
  editMode: boolean;
  addRequest?: WidgetType;
  clearAddRequest: () => void;
  onUpdate: (patch: Partial<TabConfig>) => void;
}

export const getNextY = (layout: Layout[]) =>
  layout.length ? Math.max(...layout.map((item) => item.y + item.h)) : 0;

export const adjustLayoutPositions = (layout: Layout[]): Layout[] => {
  const sorted = [...layout].sort((left, right) => left.y - right.y || left.x - right.x);
  const adjusted: Layout[] = [];

  sorted.forEach((item) => {
    let newY = item.y;
    while (
      adjusted.some(
        (layoutItem) =>
          layoutItem.i !== item.i &&
          layoutItem.y < newY + item.h &&
          layoutItem.y + layoutItem.h > newY &&
          layoutItem.x < item.x + item.w &&
          layoutItem.x + layoutItem.w > item.x,
      )
    ) {
      newY++;
    }
    adjusted.push({ ...item, y: newY });
  });

  return adjusted;
};

const WidgetGrid: React.FC<Props> = ({ tab, editMode, addRequest, clearAddRequest, onUpdate }) => {
  const [confirmState, setConfirmState] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => Promise<void> }>(() => ({ open: false }));
  const propagateToAllBreakpoints = useCallback(
    (item: Layout): Layouts => {
      const next: Layouts = { ...tab.layouts };
      (Object.keys(breakpoints) as BP[]).forEach((bp) => {
        const layout = next[bp] ? [...next[bp]!] : [];
        if (!layout.find((existing) => existing.i === item.i)) {
          layout.push({ ...item });
        }
        next[bp] = layout;
      });
      return next;
    },
    [tab.layouts],
  );

  const addWidget = useCallback(
    (type: WidgetType) => {
      const id = uuid();
      const base: Layout = {
        i: id,
        x: 0,
        y: getNextY(tab.layouts.lg || []),
        w: 2,
        h: 3,
        minW: 1,
        minH: 2,
      };
      onUpdate({
        widgets: [...tab.widgets, { id, type }],
        layouts: propagateToAllBreakpoints(base),
      });
    },
    [onUpdate, propagateToAllBreakpoints, tab.layouts, tab.widgets],
  );

  useEffect(() => {
    if (addRequest) {
      addWidget(addRequest);
      clearAddRequest();
    }
  }, [addRequest, addWidget, clearAddRequest]);

  const onLayoutChange = (_: Layout[], layouts: Layouts) => onUpdate({ layouts });

  const onResizeStop = (layout: Layout[], newItem: Layout) => {
    const updated = layout.map((item) => (item.i === newItem.i ? newItem : item));
    const adjusted = adjustLayoutPositions(updated);

    const layouts: Layouts = { ...tab.layouts };
    (Object.keys(breakpoints) as BP[]).forEach((bp) => {
      layouts[bp] = layouts[bp]?.map((item: Layout) =>
        item.i === newItem.i
          ? { ...newItem, y: adjusted.find((layoutItem) => layoutItem.i === item.i)?.y ?? item.y }
          : item,
      );
    });

    onUpdate({ layouts });
  };

  return (
    <div className="relative h-full w-full overflow-auto">
      <ResponsiveGridLayout
        className={`layout ${editMode ? 'editing-grid' : ''}`}
        layouts={tab.layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={30}
        margin={[8, 8]}
        containerPadding={[16, 16]}
        compactType={editMode ? undefined : 'vertical'}
        isDraggable={editMode}
        isResizable={editMode}
        preventCollision={!editMode}
        draggableHandle={editMode ? '.drag-handle' : undefined}
        draggableCancel=".no-drag"
        useCSSTransforms={false}
        onLayoutChange={(current, all) => onLayoutChange(current, all)}
        onResizeStop={onResizeStop}
        style={{ height: '100%' }}
      >
        {tab.widgets.map((widget) => {
          const layout =
            tab.layouts.lg?.find((item: Layout) => item.i === widget.id) || {
              i: widget.id,
              x: 0,
              y: 0,
              w: 1,
              h: 1,
            };
          return (
            <div
              key={widget.id}
              data-grid={layout}
              className="ui-panel relative rounded-2xl"
            >
              {editMode && (
                <div className="drag-handle absolute right-1 top-1 cursor-move p-1">
                  <Move size={16} className="text-[var(--text-muted)]" />
                </div>
              )}
              <WidgetWrapper
                widget={widget}
                editMode={editMode}
                layout={layout}
                onLayoutChange={(nextLayout) => onLayoutChange([nextLayout], tab.layouts)}
                onRemove={() => {
                  setConfirmState({ open: true, title: 'Delete widget', message: 'Delete this widget?', onConfirm: async () => {
                    const widgets = tab.widgets.filter((item) => item.id !== widget.id);
                    const layouts: Layouts = Object.fromEntries(
                      Object.entries(tab.layouts).map(([bp, arr]) => [
                        bp,
                        (arr as Layout[]).filter((item) => item.i !== widget.id),
                      ]),
                    ) as Layouts;
                    onUpdate({ widgets, layouts });
                  } });
                }}
              />
            </div>
          );
        })}
      </ResponsiveGridLayout>
      <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message} onConfirm={async () => {
        const h = confirmState.onConfirm;
        setConfirmState({ open: false });
        if (h) await h();
      }} onCancel={() => setConfirmState({ open: false })} />
    </div>
  );
};

export default WidgetGrid;
