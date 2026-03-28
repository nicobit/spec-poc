import { describe, expect, it } from 'vitest';
import type { Layout } from 'react-grid-layout';

import { adjustLayoutPositions, getNextY } from './WidgetGrid';

describe('WidgetGrid layout helpers', () => {
  it('computes the next available y position', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 2, h: 3 },
      { i: 'b', x: 0, y: 4, w: 2, h: 2 },
    ] as Layout[];

    expect(getNextY(layout)).toBe(6);
    expect(getNextY([])).toBe(0);
  });

  it('pushes overlapping widgets down to avoid collisions', () => {
    const layout = [
      { i: 'a', x: 0, y: 0, w: 2, h: 2 },
      { i: 'b', x: 0, y: 0, w: 2, h: 2 },
    ] as Layout[];

    const adjusted = adjustLayoutPositions(layout);

    expect(adjusted[0].y).toBe(0);
    expect(adjusted[1].y).toBeGreaterThanOrEqual(2);
  });
});
