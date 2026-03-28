import { useContext } from 'react';
import { Loader2 } from 'lucide-react';

import { QueryContext } from '../contexts/QueryContext';

export default function ChatSidebar() {
  const queryContext = useContext(QueryContext);

  if (!queryContext) {
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const { queries, selectQuery } = queryContext;

  return (
    <aside className="h-full w-60 overflow-y-auto border-r border-gray-200 p-4 dark:border-gray-700">
      <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-500">
        Previous Queries:
      </h2>
      <ul className="space-y-1">
        {queries.length > 0 ? (
          queries.map((entry, index) => (
            <li key={index}>
              <button
                onClick={() => selectQuery(index)}
                className="w-full rounded px-2 py-2 text-left hover:bg-gray-300 focus:outline-none dark:hover:bg-gray-700"
              >
                <span className="block truncate" title={entry.query}>
                  {entry.query}
                </span>
              </button>
            </li>
          ))
        ) : (
          <li className="py-2 text-gray-500">(No queries yet)</li>
        )}
      </ul>
      <hr className="mt-2 dark:border-gray-700" />
    </aside>
  );
}
