import { useContext, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Database, Loader2, Maximize2, MessageSquare, Minimize2, Sparkles, X, ChevronDown } from 'lucide-react';

import { QueryContext } from '@/features/chat/contexts/QueryContext';
import MarkdownAnswer from '@/features/chat/components/MarkdownAnswer';
import StageServicesPanel from './StageServicesPanel';
import { themeClasses } from '@/theme/themeClasses';

type AssistantPanelProps = {
  width: number;
  topOffset: number;
  expanded: boolean;
  onWidthChange: (nextWidth: number) => void;
  onToggleExpand: () => void;
  onClose: () => void;
};

const MIN_PANEL_WIDTH = 360;
const MAX_PANEL_WIDTH = 720;
const MAX_COMPOSER_HEIGHT = 240;

function clampWidth(value: number) {
  return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, value));
}

export default function AssistantPanel({
  width,
  topOffset,
  expanded,
  onWidthChange,
  onToggleExpand,
  onClose,
}: AssistantPanelProps) {
  const queryContext = useContext(QueryContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [previewSessions, setPreviewSessions] = useState<any[]>([]);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'ai' | 'nl_sql'>('ai');
  const [stagePanelOpen, setStagePanelOpen] = useState(false);

  const queries = queryContext?.queries ?? [];
  const hasPendingEntry = queries.some((entry) => entry.isPending);

  useEffect(() => {
    if (typeof listEndRef.current?.scrollIntoView === 'function') {
      listEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [queries, loading]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = '0px';
    element.style.height = `${Math.min(element.scrollHeight, MAX_COMPOSER_HEIGHT)}px`;
  }, [input]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizeStateRef.current) return;
      const nextWidth = clampWidth(
        resizeStateRef.current.startWidth + (resizeStateRef.current.startX - event.clientX),
      );
      onWidthChange(nextWidth);
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onWidthChange]);

  const canSubmit = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!queryContext || !canSubmit) return;
    const prompt = input.trim();
    setInput('');
    setLoading(true);
    try {
      // If AI mode, prefix so QueryContext routes to AI endpoint
      if (mode === 'ai') {
        await queryContext.runQuery(`ai: ${prompt}`);
      } else {
        await queryContext.runQuery(prompt);
      }
    } finally {
      setLoading(false);
    }
  };

  const startResize = (clientX: number) => {
    resizeStateRef.current = { startX: clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <aside
      style={{
        width: expanded ? undefined : `${width}px`,
        height: `calc(100dvh - ${topOffset}px)`,
      }}
      className={`${themeClasses.panel} assistant-panel-enter sticky top-0 relative flex min-h-0 ${expanded ? 'flex-1 self-stretch' : 'shrink-0 self-start'} flex-col overflow-hidden rounded-none border border-[var(--border-subtle)] shadow-[0_24px_48px_color-mix(in_srgb,var(--surface-app)_24%,transparent)]`}
      aria-label="AI assistant panel"
      data-testid="assistant-panel"
      data-expanded={expanded ? 'true' : 'false'}
    >
      {!expanded ? (
        <button
          type="button"
          className="absolute inset-y-0 left-0 z-10 w-3 cursor-col-resize bg-transparent"
          aria-label="Resize assistant panel"
          onMouseDown={(event) => startResize(event.clientX)}
        />
      ) : null}

      <div className="relative flex items-start border-b border-[var(--border-subtle)] px-5 pb-4 pt-3">
        <div className="min-w-0 pr-16">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] text-[var(--accent-primary)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">AI assistant</div>
              <div className={`${themeClasses.helperText} text-xs`}>Ask questions without leaving the current page.</div>
            </div>
          </div>
        </div>
        <div className="absolute right-2 top-2 flex items-center gap-1">
          {/* Recent sessions dropdown placed in assistant header */}
          <div className="relative">
            <button
              type="button"
              className={`${themeClasses.iconButton} rounded-full p-1`}
              aria-label="Recent chats"
              onClick={async () => {
                setMenuOpen((v) => !v);
                try {
                  await queryContext?.loadSessions();
                  setPreviewSessions(queryContext?.sessions?.slice(0, 3) ?? []);
                } catch {}
              }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-64 rounded-md border bg-white p-2 shadow-lg dark:bg-gray-900">
                {previewSessions.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-gray-500">No recent chats</div>
                ) : (
                  previewSessions.map((s) => (
                    <button
                      key={s.id}
                      className="block w-full truncate px-2 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={async () => {
                        try {
                          await queryContext?.loadSession(s.id);
                          setMenuOpen(false);
                        } catch {}
                      }}
                    >
                      {s.name}
                    </button>
                  ))
                )}
                <div className="mt-1 border-t pt-1">
                  <button
                    className="w-full rounded px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                    onClick={async () => {
                      setMenuOpen(false);
                      await queryContext?.loadSessions();
                    }}
                  >
                    Open all sessions
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            title="Stage services"
            className={`${themeClasses.iconButton} rounded-full p-1`}
            onClick={() => setStagePanelOpen((v) => !v)}
          >
            <Database className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className={`${themeClasses.iconButton} rounded-full p-1`}
            onClick={onToggleExpand}
            aria-label={expanded ? 'Restore AI assistant width' : 'Expand AI assistant'}
          >
            {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            className={`${themeClasses.iconButton} rounded-full p-1`}
            onClick={onClose}
            aria-label="Close AI assistant"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {stagePanelOpen && <StageServicesPanel />}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4">
          {queries.length === 0 ? (
            <div className={`${themeClasses.emptyState} flex min-h-full flex-col items-center justify-center rounded-3xl px-6 py-10 text-center`}>
              <MessageSquare className="mb-4 h-10 w-10 text-[var(--text-muted)]" />
              <div className="text-sm font-semibold text-[var(--text-primary)]">Start a conversation</div>
              <div className={`${themeClasses.helperText} mt-2 max-w-xs`}>
                Ask about environments, schedules, clients, or the current portal context.
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {queries.map((entry, index) => (
                <article key={`${entry.query}-${index}`} className="space-y-3">
                  <div className="ml-auto max-w-[88%] rounded-3xl bg-[color-mix(in_srgb,var(--accent-primary)_10%,var(--surface-elevated))] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm">
                    {entry.query}
                  </div>
                  <div className="max-w-[92%] rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm">
                    {entry.error ? (
                      <div className="text-[var(--status-error-text)]">{entry.error}</div>
                    ) : entry.isPending ? (
                      <div className="flex items-center gap-2 text-[var(--text-muted)]">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    ) : entry.answer ? (
                      <MarkdownAnswer content={entry.answer || ''} />
                    ) : (
                      <div className={themeClasses.helperText}>No answer returned.</div>
                    )}
                  </div>
                </article>
              ))}
              {loading && !hasPendingEntry ? (
                <div className="flex items-center gap-2 rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-muted)] shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              ) : null}
              <div ref={listEndRef} />
            </div>
          )}
        </div>

        <div className="px-4 pb-4 pt-3">
          <form
            onSubmit={handleSubmit}
            className="rounded-[1.6rem] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 shadow-[0_10px_28px_color-mix(in_srgb,var(--surface-app)_18%,transparent)]"
          >
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                rows={1}
                placeholder={mode === 'ai' ? 'Ask anything about the portal...' : 'Describe the data you want to query...'}
                className="max-h-[240px] min-h-[2.5rem] flex-1 resize-none bg-transparent px-0 py-1 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void handleSubmit(event as unknown as FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                className={`${canSubmit ? themeClasses.buttonPrimary : themeClasses.buttonSecondary} flex h-11 w-11 items-center justify-center rounded-2xl p-0`}
                aria-label={canSubmit ? 'Send assistant message' : 'Assistant message inactive'}
                disabled={!canSubmit}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2 flex items-center gap-1 border-t border-[var(--border-subtle)] pt-2">
              <button
                type="button"
                onClick={() => setMode('ai')}
                aria-pressed={mode === 'ai'}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === 'ai'
                    ? 'bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                AI
              </button>
              <button
                type="button"
                onClick={() => setMode('nl_sql')}
                aria-pressed={mode === 'nl_sql'}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  mode === 'nl_sql'
                    ? 'bg-[color-mix(in_srgb,var(--accent-primary)_14%,transparent)] text-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Database className="h-3 w-3" />
                NL→SQL
              </button>
            </div>
          </form>
        </div>
      </div>
    </aside>
  );
}
