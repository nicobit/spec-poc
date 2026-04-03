import { lazy, Suspense, useContext, useEffect, useRef, useState, type FormEvent } from 'react';
import ReactMarkdown from 'react-markdown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Maximize2,
  MessageCircle,
  Minimize2,
  Table,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  X,
} from 'lucide-react';

import LoadingIndicator from '@/features/chat/components/LoadingIndicator';

import { QueryContext } from '../contexts/QueryContext';

const ResultsTable = lazy(() => import('./ResultsTable'));
const BarChart = lazy(() => import('./BarChart'));
const Reasoning = lazy(() => import('./Reasoning'));
const MermaidDiagram = lazy(() => import('./MermaidDiagram'));
const Mermaid = lazy(() => import('./Mermaid'));

export default function Chat() {
  const queryContext = useContext(QueryContext);
  const listEndRef = useRef<HTMLLIElement | null>(null);
  const [input, setInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [selectedTab, setSelectedTab] = useState<number>(0);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [queryContext?.queries]);

  if (!queryContext) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  const { queries, runQuery, selectQuery, resetSession } = queryContext;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    setInput('');
    setLoading(true);
    try {
      await runQuery(input.trim());
    } finally {
      setLoading(false);
    }
  };

  const toggleDialog = (index?: number) => {
    if (index !== undefined) {
      selectQuery(index);
    }
    setIsDialogOpen((previous) => !previous);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-end">
        <button
          onClick={() => resetSession()}
          className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          aria-label="Start a new chat session"
        >
          New chat
        </button>
      </div>
      <ul className="custom-scrollbar mb-4 flex-1 space-y-4 overflow-y-auto overflow-y-scroll">
        {queries.map((entry, index) => (
          <li key={index} ref={index === queries.length - 1 ? listEndRef : null}>
            <p className="font-semibold text-green-700">
              <strong>User:</strong> {entry.query}
            </p>
            {entry.error ? (
              <p className="text-red-600">
                <strong>Error:</strong> {entry.error}
              </p>
            ) : entry.answer || entry.mermaid ? (
              <div>
                <div className="mt-2 border-l-2 border-gray-300 pl-4 text-gray-600">
                  <div
                    className="flex cursor-pointer select-none items-center justify-between"
                    onClick={() => {
                      const updated = [...queries];
                      updated[index].isExpanded = !updated[index].isExpanded;
                      queryContext.setQueries(updated);
                    }}
                  >
                    <span className="font-medium">Reasoning:</span>
                    <button className="p-1 focus:outline-none">
                      {entry.isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                  {entry.isExpanded && (
                      <div className="prose prose-sm mt-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.reasoning}</ReactMarkdown>
                    </div>
                  )}
                </div>

                <div className="mt-2">
                  <div
                    className="prose prose-sm"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(entry.answer || '')) }}
                  />
                  <Suspense fallback={<div className="text-sm text-gray-500">Loading diagram...</div>}>
                    <MermaidDiagram chart={entry.mermaid || ''} />
                  </Suspense>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  <strong>System:</strong> Query executed. Returned{' '}
                  {Array.isArray(entry.result) ? entry.result.length : 0} rows.
                </p>

                <div className="mt-2 flex space-x-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(entry.answer!)}
                    className="p-1 focus:outline-none"
                    aria-label="copy"
                  >
                    <Copy className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </button>
                  <button className="p-1 focus:outline-none" aria-label="like">
                    <ThumbsUp className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </button>
                  <button className="p-1 focus:outline-none" aria-label="dislike">
                    <ThumbsDown className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </button>
                  <button className="p-1 focus:outline-none" aria-label="speak">
                    <Volume2 className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                  </button>
                  {entry.result !== null && (
                    <button
                      onClick={() => toggleDialog(index)}
                      className="p-1 focus:outline-none"
                      aria-label="table"
                    >
                      <Table className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </li>
        ))}
        {loading ? <LoadingIndicator /> : <div className="h-2" />}
      </ul>

      <form
        onSubmit={handleSubmit}
        className="flex items-start rounded-lg border border-gray-300 bg-transparent p-2 shadow-lg dark:border-gray-700"
      >
        <textarea
          rows={2}
          placeholder="Ask anything"
          className="flex-1 resize-none rounded-md border-none bg-transparent p-2 focus:outline-none dark:bg-gray-900 dark:text-white"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              handleSubmit(event as unknown as FormEvent);
            }
          }}
        />
        <button
          type="submit"
          className={`ml-2 rounded-full p-2 focus:outline-none ${
            loading
              ? 'bg-gray-600 text-white hover:bg-gray-700 dark:bg-gray-500 dark:text-gray-200 dark:hover:bg-gray-600'
              : input.trim()
                ? 'bg-gray-600 text-white hover:bg-indigo-700 dark:bg-gray-500 dark:text-gray-200 dark:hover:bg-indigo-600'
                : 'bg-gray-400 text-gray-500 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-400 dark:hover:bg-gray-500'
          }`}
          aria-label={loading ? 'stop' : input.trim() ? 'send' : 'speak'}
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-gray-100 dark:text-gray-100" />
          ) : input.trim() ? (
            <ArrowUp className="h-6 w-6 text-white dark:text-gray-200" />
          ) : (
            <MessageCircle className="h-6 w-6 text-gray-100 dark:text-gray-100" />
          )}
        </button>
      </form>

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex w-full items-center justify-center bg-black bg-opacity-50">
          <div
            className={`flex flex-col overflow-auto rounded-lg bg-white shadow-lg dark:bg-gray-800 ${
              isFullScreen ? 'm-0 h-full w-full' : 'm-4 max-h-[90vh] w-[80%]'
            }`}
          >
            <div className="flex items-center justify-between border-b border-gray-300 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Results</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsFullScreen((previous) => !previous)}
                  className="p-1 focus:outline-none"
                  aria-label="toggle fullscreen"
                >
                  {isFullScreen ? (
                    <Minimize2 className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                  ) : (
                    <Maximize2 className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                  )}
                </button>
                <button
                  onClick={() => toggleDialog()}
                  className="p-1 focus:outline-none"
                  aria-label="close"
                >
                  <X className="h-5 w-5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                </button>
              </div>
            </div>
            <nav className="border-b border-gray-300 dark:border-gray-700">
              <ul className="flex">
                {['Results Table', 'Chart', 'Mermaid Diagram', 'Reasoning'].map((label, index) => (
                  <li
                    key={index}
                    onClick={() => setSelectedTab(index)}
                    className={`cursor-pointer px-4 py-2 ${
                      selectedTab === index
                        ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </li>
                ))}
              </ul>
            </nav>
            <div className="min-h-[700px] flex-1 overflow-auto bg-gray-50 p-4 dark:bg-gray-900">
              {selectedTab === 0 && (
                <Suspense fallback={<div className="text-sm text-gray-500">Loading results...</div>}>
                  <ResultsTable />
                </Suspense>
              )}
              {selectedTab === 1 && (
                <Suspense fallback={<div className="text-sm text-gray-500">Loading chart...</div>}>
                  <BarChart />
                </Suspense>
              )}
              {selectedTab === 2 && (
                <Suspense fallback={<div className="text-sm text-gray-500">Loading diagram editor...</div>}>
                  <Mermaid />
                </Suspense>
              )}
              {selectedTab === 3 && (
                <Suspense fallback={<div className="text-sm text-gray-500">Loading reasoning...</div>}>
                  <Reasoning />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
