import { describe, expect, it } from 'vitest';

import { buildQueryErrorEntry, buildQuerySuccessEntry } from './QueryContext';

describe('QueryContext helpers', () => {
  it('maps a successful response into a stored query entry', () => {
    const entry = buildQuerySuccessEntry('show active users', {
      sql_query: 'select * from users where active = 1',
      results: [{ id: 1 }],
      answer: '1 active user',
      chart_type: 'table',
      execution_history: [],
      reasoning: 'filtered on active',
      mermaid: 'graph TD;',
    });

    expect(entry).toMatchObject({
      query: 'show active users',
      answer: '1 active user',
      chartType: 'table',
      error: null,
      sql_query: 'select * from users where active = 1',
      mermaid: 'graph TD;',
    });
    expect(entry.result).toEqual([{ id: 1 }]);
  });

  it('maps failures into a consistent error entry', () => {
    const entry = buildQueryErrorEntry('show active users', new Error('Backend unavailable'));

    expect(entry).toEqual({
      query: 'show active users',
      result: null,
      answer: '',
      chartType: '',
      error: 'Backend unavailable',
    });
  });
});
