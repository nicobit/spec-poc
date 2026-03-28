import { useContext, useState } from 'react';
import { Code as CodeIcon, Copy, Download, Loader2 } from 'lucide-react';

import { QueryContext } from '../contexts/QueryContext';

export default function ResultsTable() {
  const queryContext = useContext(QueryContext);
  const [showSql, setShowSql] = useState(false);

  if (!queryContext) {
    return (
      <div className="flex h-48 items-center justify-center bg-white dark:bg-gray-900">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const { queries, selectedIndex } = queryContext;
  const current =
    selectedIndex !== null && selectedIndex < queries.length ? queries[selectedIndex] : null;

  const data =
    current && Array.isArray(current.result) ? (current.result as Record<string, any>[]) : null;
  const error = current?.error || null;
  const sqlQuery = current?.sql_query || 'No SQL query available';

  if (error) {
    return <p className="mt-2 text-red-600 dark:text-red-400">Error: {error}</p>;
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded bg-white p-4 dark:bg-gray-900">
        <p className="mt-2 text-gray-800 dark:text-gray-200">No results to display.</p>
        <div className="mt-4 rounded bg-gray-100 p-4 dark:bg-gray-800">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-900 dark:text-gray-100">
            {sqlQuery}
          </pre>
        </div>
      </div>
    );
  }

  const columns = Object.keys(data[0]);

  const handleCopy = () => {
    const header = columns.join('\t');
    const rows = data.map((row) => columns.map((column) => row[column]).join('\t'));
    navigator.clipboard.writeText(`${header}\n${rows.join('\n')}`);
  };

  const handleDownload = () => {
    const rows = [columns, ...data.map((row) => columns.map((column) => row[column]))];
    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'table_data.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-red flex h-full flex-col rounded p-4 dark:bg-gray-900">
      <div className="mb-2 flex justify-end space-x-2">
        <button
          onClick={handleCopy}
          className="flex items-center rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Copy className="mr-1 h-4 w-4 text-gray-600 dark:text-gray-300" />
          Copy
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <Download className="mr-1 h-4 w-4 text-gray-600 dark:text-gray-300" />
          Download
        </button>
        <button
          onClick={() => setShowSql((previous) => !previous)}
          className="flex items-center rounded border border-gray-300 px-2 py-1 hover:bg-gray-50 focus:outline-none dark:border-gray-600 dark:hover:bg-gray-800"
        >
          <CodeIcon className="mr-1 h-4 w-4 text-gray-600 dark:text-gray-300" />
          {showSql ? 'Hide SQL' : 'Show SQL'}
        </button>
      </div>

      {showSql && (
        <div className="mb-4 rounded bg-gray-100 p-4 dark:bg-gray-800">
          <pre className="whitespace-pre-wrap break-words font-mono text-sm text-gray-900 dark:text-gray-100">
            {sqlQuery}
          </pre>
        </div>
      )}

      <div className="max-h-[60vh] overflow-auto rounded border border-gray-200 dark:border-gray-700">
        <table className="min-h-full min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-2 text-left font-medium text-gray-700 dark:text-gray-200"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                {columns.map((column) => (
                  <td
                    key={`${column}-${rowIndex}`}
                    className="px-3 py-2 text-gray-800 dark:text-gray-100"
                  >
                    {row[column] !== undefined ? String(row[column]) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
