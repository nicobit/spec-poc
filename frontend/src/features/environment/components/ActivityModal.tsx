import React from 'react';
import { ActivityEntry } from '../api';

type Props = {
  open: boolean;
  onClose: () => void;
  entry: ActivityEntry | null;
};

export default function ActivityModal({ open, onClose, entry }: Props) {
  if (!open || !entry) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Activity details</h3>
          <button onClick={onClose} aria-label="Close" className="ml-4">
            X
          </button>
        </div>
        <div className="mt-4 max-h-80 overflow-auto text-sm">
          <dl>
            {Object.entries(entry).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 gap-2 py-1">
                <dt className="font-medium text-gray-600">{key}</dt>
                <dd className="col-span-2 break-words text-gray-800">
                  {typeof value === 'string' ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
