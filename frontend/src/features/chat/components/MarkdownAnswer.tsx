import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import MermaidDiagram from './MermaidDiagram';
import MarkdownErrorBoundary from './MarkdownErrorBoundary';

type MarkdownAnswerProps = {
  content: string;
};

function normalizeFenceContent(value: string) {
  return value.replace(/\n$/, '');
}

export default function MarkdownAnswer({ content }: MarkdownAnswerProps) {
  const safeContent = typeof content === 'string' ? content : String(content ?? '');

  try {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:rounded-2xl prose-pre:border prose-pre:border-[var(--border-subtle)] prose-pre:bg-[var(--surface-app)] prose-code:text-[var(--text-primary)]">
        <MarkdownErrorBoundary>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ inline, className, children, ...props }: any) {
                const language = /language-([\w-]+)/.exec(className || '')?.[1];
                const code = normalizeFenceContent(String(children ?? ''));

                if (!inline && language === 'mermaid') {
                  return (
                    <div className="my-4 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-app)] p-3">
                      <MermaidDiagram chart={code} sx={{ width: '100%', maxWidth: '100%' }} />
                    </div>
                  );
                }

                if (inline) {
                  return (
                    <code className="rounded bg-[color-mix(in_srgb,var(--surface-app)_70%,transparent)] px-1.5 py-0.5" {...props}>
                      {children}
                    </code>
                  );
                }

                return (
                  <pre className="overflow-x-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-app)] p-3">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
            }}
          >
            {safeContent}
          </ReactMarkdown>
        </MarkdownErrorBoundary>
      </div>
    );
  } catch (e) {
    // Defensive fallback to avoid crashing the whole app when markdown parsing fails
    // Log to console for local debugging and render plain text
    // eslint-disable-next-line no-console
    console.error('Markdown rendering error', e);
    return <div className="text-sm text-[var(--text-error)]">Error rendering content</div>;
  }
}
