import { describe, expect, it } from 'vitest';
import { normalizeWidgetType } from '@/types';
import { getWidgetDefinition, getWidgetOptions, widgetDefinitions } from './registry';

describe('widget registry', () => {
  it('normalizes legacy widget type names', () => {
    expect(normalizeWidgetType('chartwidge_t')).toBe('chart');
    expect(normalizeWidgetType('tablewidget_')).toBe('table');
    expect(normalizeWidgetType('textwidget_')).toBe('text');
  });

  it('resolves legacy widget types through the registry', () => {
    expect(getWidgetDefinition('chartwidge_t')?.title).toBe('Chart');
    expect(getWidgetDefinition('tablewidget_')?.title).toBe('Table');
    expect(getWidgetDefinition('textwidget_')?.title).toBe('Text');
  });

  it('exposes one palette option per widget definition', () => {
    expect(getWidgetOptions()).toHaveLength(widgetDefinitions.length);
  });
});
