import { Layouts } from 'react-grid-layout';
export type WidgetType =
  | 'azurearchitecturediagram'
  | 'azureupdate'
  | 'chart'
  | 'clock'
  | 'counter'
  | 'quote'
  | 'table'
  | 'text'
  | 'timezone'
  | 'world'
  | 'yahoostocktrend'
  | 'envstatus';
export interface WidgetConfig { id: string; type: WidgetType; config?: any; }
export interface TabConfig { id: string; name: string; widgets: WidgetConfig[]; layouts: Layouts; }

const legacyWidgetTypeMap = {
  chartwidge_t: 'chart',
  tablewidget_: 'table',
  textwidget_: 'text',
} as const satisfies Record<string, WidgetType>;

export const normalizeWidgetType = (type: string): WidgetType => {
  if (type in legacyWidgetTypeMap) {
    return legacyWidgetTypeMap[type as keyof typeof legacyWidgetTypeMap];
  }

  return type as WidgetType;
};

export const normalizeTabConfig = (tab: TabConfig): TabConfig => ({
  ...tab,
  widgets: tab.widgets.map((widget) => ({
    ...widget,
    type: normalizeWidgetType(widget.type),
  })),
});

export const normalizeTabs = (tabs: TabConfig[]): TabConfig[] =>
  tabs.map(normalizeTabConfig);
