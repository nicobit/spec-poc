import { describe, expect, it } from 'vitest';

import { buildPendingQueryEntry, buildQueryErrorEntry, buildQuerySuccessEntry } from './QueryContext';

describe('QueryContext helpers', () => {
  it('creates a pending entry so the user question is visible immediately', () => {
    const entry = buildPendingQueryEntry('query-1', 'show active users');

    expect(entry).toEqual({
      id: 'query-1',
      query: 'show active users',
      result: null,
      answer: '',
      chartType: '',
      error: null,
      isPending: true,
      execution_history: [],
    });
  });

  it('maps a successful response into a stored query entry', () => {
    const entry = buildQuerySuccessEntry('show active users', {
      sql_query: 'select * from users where active = 1',
      results: [{ id: 1 }],
      answer: '1 active user',
      chart_type: 'table',
      execution_history: [],
      reasoning: 'filtered on active',
      mermaid: 'graph TD;',
    }, 'query-1');

    expect(entry).toMatchObject({
      id: 'query-1',
      query: 'show active users',
      answer: '1 active user',
      chartType: 'table',
      error: null,
      isPending: false,
      sql_query: 'select * from users where active = 1',
      mermaid: 'graph TD;',
    });
    expect(entry.result).toEqual([{ id: 1 }]);
  });

  it('maps failures into a consistent error entry', () => {
    const entry = buildQueryErrorEntry('show active users', new Error('Backend unavailable'), 'query-1');

    expect(entry).toEqual({
      id: 'query-1',
      query: 'show active users',
      result: null,
      answer: '',
      chartType: '',
      error: 'Backend unavailable',
      isPending: false,
    });
  });
});
