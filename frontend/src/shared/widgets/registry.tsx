import React, { lazy } from 'react';
import { Cloud, Globe, Newspaper } from 'lucide-react';
import { normalizeWidgetType, type WidgetType } from '@/types';

export interface WidgetDefinition {
  type: WidgetType;
  title: string;
  component: React.ComponentType<any>;
  icon?: React.ReactNode;
}

export const widgetDefinitions: WidgetDefinition[] = [
  {
    type: 'azurearchitecturediagram',
    title: 'Azure Architecture Diagram',
    component: lazy(() => import('./AzureArchitectureDiagramWidget')),
    icon: <Cloud className="h-6 w-6 text-blue-500" />,
  },
  {
    type: 'azureupdate',
    title: 'Azure Update',
    component: lazy(() => import('./AzureUpdateWidget')),
    icon: <Newspaper className="h-6 w-6 text-blue-500" />,
  },
  {
    type: 'chart',
    title: 'Chart',
    component: lazy(() => import('./ChartWidget')),
  },
  {
    type: 'clock',
    title: 'Clock',
    component: lazy(() => import('./ClockWidget')),
  },
  {
    type: 'counter',
    title: 'Counter',
    component: lazy(() => import('./CounterWidget')),
  },
  {
    type: 'quote',
    title: 'Quote',
    component: lazy(() => import('./QuoteWidget')),
  },
  {
    type: 'table',
    title: 'Table',
    component: lazy(() => import('./TableWidget')),
  },
  {
    type: 'text',
    title: 'Text',
    component: lazy(() => import('./TextWidget')),
  },
  {
    type: 'timezone',
    title: 'Time Zone',
    component: lazy(() => import('./TimeZoneWidget')),
  },
  {
    type: 'world',
    title: 'World',
    component: lazy(() => import('./WorldWidget')),
    icon: <Globe className="h-6 w-6 text-blue-500" />,
  },
  {
    type: 'yahoostocktrend',
    title: 'Yahoo Stock Trend',
    component: lazy(() => import('./YahooStockTrendWidget')),
  },
  {
    type: 'envstatus',
    title: 'Environment Status',
    component: lazy(() => import('./EnvStatusWidget')),
    icon: <Cloud className="h-6 w-6 text-green-500" />,
  },
];

const widgetDefinitionMap = new Map(
  widgetDefinitions.map((definition) => [definition.type, definition])
);

export const getWidgetDefinition = (type: string): WidgetDefinition | undefined =>
  widgetDefinitionMap.get(normalizeWidgetType(type));

export const getWidgetOptions = (): Array<Pick<WidgetDefinition, 'type' | 'title' | 'icon'>> =>
  widgetDefinitions.map(({ type, title, icon }) => ({ type, title, icon }));
