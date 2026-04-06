import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MarkdownAnswer from './MarkdownAnswer';

vi.mock('./MermaidDiagram', () => ({
  default: ({ chart }: { chart: string }) => <div data-testid="mermaid-diagram">{chart}</div>,
}));

describe('MarkdownAnswer', () => {
  it('renders standard markdown content', () => {
    render(<MarkdownAnswer content={'## Title\n\n- one\n- two'} />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeTruthy();
    expect(screen.getByText('one')).toBeTruthy();
    expect(screen.getByText('two')).toBeTruthy();
  });

  it('renders fenced mermaid blocks with the Mermaid diagram component', () => {
    render(<MarkdownAnswer content={'```mermaid\ngraph TD\nA --> B\n```'} />);

    expect(screen.getByTestId('mermaid-diagram').textContent).toContain('graph TD\nA --> B');
  });

  it('passes compact subgraph mermaid content through to the diagram renderer', () => {
    render(<MarkdownAnswer content={'```mermaid\nflowchart TD\nsubgraph Environments E1[PROVA (env-5ce915aa)] end\n```'} />);

    expect(screen.getByTestId('mermaid-diagram').textContent).toContain('subgraph Environments E1[PROVA (env-5ce915aa)] end');
  });
});
