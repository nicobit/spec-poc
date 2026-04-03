import { useContext, useEffect, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

import { QueryContext } from '../contexts/QueryContext';

function relativeDate(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

export default function SessionSidebar() {
  const queryContext = useContext(QueryContext);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    if (queryContext) {
      (async () => {
        try {
          setLoading(true);
          await queryContext.loadSessions();
        } finally {
          if (mounted) setLoading(false);
        }
      })();
    }
    return () => {
      mounted = false;
    };
    // load once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  if (!queryContext) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { sessions, activeSessionId, loadSession, renameSession, deleteSession } = queryContext;

  const handleStartRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameCommit = async (id: string) => {
    const trimmed = renameValue.trim().slice(0, 120);
    if (trimmed) {
      await renameSession(id, trimmed);
    }
    setRenamingId(null);
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteSession(id);
    setConfirmDeleteId(null);
  };

  return (
    <aside className="flex h-full w-60 flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Chat sessions</h2>
      </div>
      <ul className="custom-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2">
        {loading ? (
          <li className="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
              <span>Loading sessions…</span>
            </div>
          </li>
        ) : sessions.length === 0 ? (
          <li className="px-2 py-4 text-center text-sm text-gray-400 dark:text-gray-500">
            No past sessions
          </li>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const isRenaming = renamingId === session.id;
            const isConfirming = confirmDeleteId === session.id;

            return (
              <li
                key={session.id}
                className={`group relative rounded-md ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-start gap-1 px-2 py-2">
                  {/* Name / rename input */}
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        className="w-full rounded border border-indigo-400 bg-white px-1 py-0.5 text-sm focus:outline-none dark:bg-gray-900 dark:text-gray-100"
                        value={renameValue}
                        maxLength={120}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameCommit(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCommit(session.id);
                          if (e.key === 'Escape') setRenamingId(null);
                        }}
                        aria-label="Rename session"
                      />
                    ) : (
                      <button
                        className="w-full text-left"
                        onClick={() => {
                          if (!isActive) loadSession(session.id);
                        }}
                        onDoubleClick={() => handleStartRename(session.id, session.name)}
                        title={`${session.name} — double-click to rename`}
                      >
                        <span
                          className={`block truncate text-sm ${
                            isActive
                              ? 'font-semibold text-indigo-700 dark:text-indigo-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {session.name}
                        </span>
                        <span className="block text-xs text-gray-400 dark:text-gray-500">
                          {relativeDate(session.updatedAt)}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Delete icon — visible on hover */}
                  {!isRenaming && (
                    <button
                      className="mt-0.5 shrink-0 rounded p-0.5 text-gray-400 opacity-0 hover:text-red-500 group-hover:opacity-100 dark:text-gray-500 dark:hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(session.id);
                      }}
                      aria-label={`Delete session "${session.name}"`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Inline delete confirmation */}
                {isConfirming && (
                  <div className="border-t border-gray-200 bg-red-50 px-2 py-2 dark:border-gray-700 dark:bg-red-900/20">
                    <p className="mb-1.5 text-xs text-red-700 dark:text-red-300">
                      Delete this session? This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
                        onClick={() => handleDeleteConfirm(session.id)}
                      >
                        Delete
                      </button>
                      <button
                        className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </aside>
  );
}
