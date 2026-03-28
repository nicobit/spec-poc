import { useContext } from 'react';
import { Loader2 } from 'lucide-react';

import { QueryContext } from '../contexts/QueryContext';

export default function Reasoning() {
  const queryContext = useContext(QueryContext);

  if (!queryContext) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading...</span>
      </div>
    );
  }

  const { queries, selectedIndex } = queryContext;
  const currentEntry =
    selectedIndex !== null && selectedIndex < queries.length ? queries[selectedIndex] : null;

  const executionHistory = currentEntry?.execution_history;

  return (
    <div className="scrollbar-thin scrollbar-thumb-indigo-600 scrollbar-track-gray-200 dark:scrollbar-thumb-indigo-400 dark:scrollbar-track-gray-700 relative mt-4 h-99 max-h-[70vh] w-full overflow-auto rounded bg-white p-4 dark:bg-gray-800">
      {Array.isArray(executionHistory) ? (
        <ul className="space-y-2">
          {executionHistory.map((item, index) => (
            <li
              key={index}
              className="border-b border-gray-300 pb-2 last:border-none dark:border-gray-700"
            >
              {Object.entries(item).map(([key, value]) => (
                <p key={key} className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}:{' '}
                  </strong>
                  {String(value)}
                </p>
              ))}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-700 dark:text-gray-300">{executionHistory}</p>
      )}
    </div>
  );
}
