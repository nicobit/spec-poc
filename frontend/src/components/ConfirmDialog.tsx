import React from 'react';

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
};

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel }: Props) {
  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative w-full max-w-md rounded bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">{title || 'Confirm'}</h3>
          <button onClick={onCancel} aria-label="Close" className="ml-4">X</button>
        </div>
        {message ? <p className="mt-3 text-sm text-gray-700">{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded px-3 py-1.5 text-sm bg-gray-100" onClick={onCancel}>{cancelLabel}</button>
          <button className="rounded px-3 py-1.5 text-sm bg-blue-600 text-white" onClick={async () => { await onConfirm(); }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
