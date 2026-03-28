import { useContext, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useTailwindDarkMode } from '@/hooks/useTailwindDarkMode';
import LazyMonacoEditor from '@/shared/ui/LazyMonacoEditor';

import { QueryContext } from '../contexts/QueryContext';
import MermaidDiagram from './MermaidDiagram';

export default function Mermaid() {
  const queryContext = useContext(QueryContext);
  const [mermaidText, setMermaidText] = useState<string>('');
  const isDark = useTailwindDarkMode();

  const queries = queryContext?.queries ?? [];
  const selectedIndex = queryContext?.selectedIndex ?? null;
  const currentEntry =
    selectedIndex !== null && selectedIndex < queries.length ? queries[selectedIndex] : null;
  const initialMermaid = currentEntry?.mermaid || 'No Mermaid diagram available';

  useEffect(() => {
    setMermaidText(initialMermaid);
  }, [initialMermaid]);

  if (!queryContext) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-4 p-4">
      <div className="flex-1 rounded bg-gray-100 p-4 dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Edit Mermaid Code
        </h2>
        <div className="h-[500px] overflow-hidden rounded border border-gray-300 dark:border-gray-700">
          <LazyMonacoEditor
            language="markdown"
            theme={isDark ? 'vs-dark' : 'vs'}
            value={mermaidText}
            onChange={(value: string | undefined) => setMermaidText(value || '')}
            options={{
              fontFamily: 'monospace',
              fontSize: 14,
              minimap: { enabled: false },
              automaticLayout: true,
              theme: 'vs-dark',
            }}
          />
        </div>
      </div>

      <div className="flex-1 rounded bg-gray-100 p-4 dark:bg-gray-800">
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Mermaid Diagram
        </h2>
        <div className="h-[500px] overflow-auto rounded border border-gray-300 p-2 dark:border-gray-700">
          <MermaidDiagram chart={mermaidText} />
        </div>
      </div>
    </div>
  );
}
