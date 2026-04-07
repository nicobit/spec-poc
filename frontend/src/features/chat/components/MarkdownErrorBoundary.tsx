import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean };

export default class MarkdownErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // eslint-disable-next-line no-console
    console.error('Markdown rendering error caught by ErrorBoundary', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div className="text-sm text-[var(--text-error)]">Error rendering content</div>;
    }
    return this.props.children as React.ReactElement;
  }
}
