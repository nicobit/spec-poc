import { useEffect, useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { IPublicClientApplication } from '@azure/msal-browser';
import { enqueueSnackbar } from 'notistack';
import { Edit2, Trash2, X } from 'lucide-react';

import LazyMonacoEditor from '@/shared/ui/LazyMonacoEditor';
import { useTailwindDarkMode } from '@/hooks/useTailwindDarkMode';

import {
  IExample,
  addExample,
  deleteExample,
  getDatabases,
  getExamples,
  updateExample,
} from '../api/example';

interface ExamplesManagerProps {
  msalInstance: IPublicClientApplication;
}

export default function QuestionQueryExample({ msalInstance }: ExamplesManagerProps) {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('default');
  const [examples, setExamples] = useState<IExample[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [current, setCurrent] = useState<IExample>({
    doc_id: '',
    question: '',
    sql: '',
    sql_embedding: [],
  });
  const [newExample, setNewExample] = useState<IExample>({
    doc_id: '',
    question: '',
    sql: '',
    sql_embedding: [],
  });

  const isDark = useTailwindDarkMode();

  useEffect(() => {
    let mounted = true;

    void import('monaco-editor').then((monaco) => {
      if (!mounted) return;
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    getDatabases(msalInstance)
      .then((databaseList) => {
        setDatabases(databaseList);
        if (databaseList.length) {
          setSelectedDatabase(databaseList[0]);
        }
      })
      .catch((error) =>
        enqueueSnackbar(`Error fetching databases: ${(error as Error).message}`, {
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  }, [msalInstance]);

  useEffect(() => {
    if (!selectedDatabase || selectedDatabase === 'default') return;
    setLoading(true);
    getExamples(msalInstance, selectedDatabase)
      .then(setExamples)
      .catch((error) =>
        enqueueSnackbar(`Error fetching examples: ${(error as Error).message}`, {
          variant: 'error',
        }),
      )
      .finally(() => setLoading(false));
  }, [selectedDatabase, msalInstance]);

  const handleDelete = (id: string) => {
    setConfirm({ open: true, title: 'Delete example', message: 'Are you sure you want to delete this example?', onConfirm: async () => {
      setLoading(true);
      try {
        await deleteExample(msalInstance, id, selectedDatabase);
        setExamples((previous) => previous.filter((example) => example.doc_id !== id));
      } catch (error) {
        enqueueSnackbar(`Error deleting example: ${(error as Error).message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    } });
  };

  const [confirm, setConfirm] = useState<{ open: boolean; title?: string; message?: string; onConfirm?: () => Promise<void> }>(() => ({ open: false }));

  const openEdit = (example: IExample) => {
    setCurrent(example);
    setEditOpen(true);
  };

  const saveEdit = () => {
    setLoading(true);
    updateExample(msalInstance, current.doc_id, current.question, current.sql, selectedDatabase)
      .then(() =>
        setExamples((previous) =>
          previous.map((example) => (example.doc_id === current.doc_id ? current : example)),
        ),
      )
      .catch((error) =>
        enqueueSnackbar(`Error updating example: ${(error as Error).message}`, { variant: 'error' }),
      )
      .finally(() => {
        setLoading(false);
        setEditOpen(false);
      });
  };

  const openCreate = () => {
    setNewExample({ doc_id: '', question: '', sql: '', sql_embedding: [] });
    setCreateOpen(true);
  };

  const saveCreate = () => {
    setLoading(true);
    addExample(msalInstance, newExample.question, newExample.sql, selectedDatabase)
      .then(() => setExamples((previous) => [...previous, newExample]))
      .catch((error) =>
        enqueueSnackbar(`Error adding example: ${(error as Error).message}`, { variant: 'error' }),
      )
      .finally(() => {
        setLoading(false);
        setCreateOpen(false);
      });
  };

  return (
    <div className="bg-white p-4 dark:bg-gray-900">
      {loading ? (
        <div className="h-1 animate-pulse bg-indigo-600 dark:bg-indigo-500" />
      ) : (
        <div className="h-1" />
      )}

      <div className="mb-2 mt-4 flex items-center space-x-4">
        <select
          className="rounded border border-gray-300 bg-white p-2 text-gray-800 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          value={selectedDatabase}
          onChange={(event) => setSelectedDatabase(event.target.value)}
        >
          {databases.map((database) => (
            <option key={database} value={database}>
              {database}
            </option>
          ))}
        </select>
        <button
          className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 focus:outline-none dark:bg-indigo-500 dark:hover:bg-indigo-400"
          onClick={openCreate}
        >
          Create New
        </button>
      </div>

      <div className="overflow-auto">
        <table className="min-w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="whitespace-normal break-words px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                Question
              </th>
              <th className="whitespace-normal break-words px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                SQL
              </th>
              <th
                className="px-4 py-2 text-center text-sm font-medium text-gray-700 dark:text-gray-200"
                colSpan={2}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {examples.map((example) => (
              <tr key={example.doc_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="whitespace-normal break-words px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {example.question}
                </td>
                <td className="whitespace-normal break-words px-4 py-2 text-sm text-gray-800 dark:text-gray-100">
                  {example.sql}
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => openEdit(example)}
                    className="p-1 hover:text-indigo-600 focus:outline-none dark:hover:text-indigo-400"
                    aria-label="Edit"
                  >
                    <Edit2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </td>
                <td className="px-4 py-2 text-center">
                  <button
                    onClick={() => handleDelete(example.doc_id)}
                    className="p-1 hover:text-red-600 focus:outline-none dark:hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="h-4/5 w-4/5 overflow-auto rounded bg-white shadow-lg dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Edit Example
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="p-1 focus:outline-none"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex h-full flex-col space-y-4 p-4" style={{ height: '80%' }}>
              <input
                type="text"
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                value={current.question}
                onChange={(event) =>
                  setCurrent((previous) => ({ ...previous, question: event.target.value }))
                }
                placeholder="Question"
              />
              <div className="flex-1 rounded border border-gray-300 dark:border-gray-600">
                <LazyMonacoEditor
                  language="sql"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={current.sql}
                  options={{ automaticLayout: true, minimap: { enabled: false } }}
                  onChange={(value: string | undefined) =>
                    setCurrent((previous) => ({ ...previous, sql: value || '' }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 focus:outline-none dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Save
              </button>
            </div>
          </div>

          <ConfirmDialog open={confirm.open} title={confirm.title} message={confirm.message} onConfirm={async () => {
            const h = confirm.onConfirm;
            setConfirm({ open: false });
            if (h) await h();
          }} onCancel={() => setConfirm({ open: false })} />
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="h-4/5 w-4/5 overflow-auto rounded bg-white shadow-lg dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Create New Example
              </h3>
              <button
                onClick={() => setCreateOpen(false)}
                className="p-1 focus:outline-none"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
            <div className="flex h-full flex-col space-y-4 p-4" style={{ height: '80%' }}>
              <input
                type="text"
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                value={newExample.question}
                onChange={(event) =>
                  setNewExample((previous) => ({ ...previous, question: event.target.value }))
                }
                placeholder="Question"
              />
              <div className="flex-1 rounded border border-gray-300 dark:border-gray-600">
                <LazyMonacoEditor
                  language="sql"
                  theme={isDark ? 'vs-dark' : 'vs'}
                  value={newExample.sql}
                  options={{ automaticLayout: true, minimap: { enabled: false } }}
                  onChange={(value: string | undefined) =>
                    setNewExample((previous) => ({ ...previous, sql: value || '' }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 border-t border-gray-200 p-4 dark:border-gray-700">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 focus:outline-none dark:bg-gray-700 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={saveCreate}
                className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500 focus:outline-none dark:bg-indigo-500 dark:hover:bg-indigo-400"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
