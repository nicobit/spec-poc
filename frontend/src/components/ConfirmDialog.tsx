import React from 'react';
import { X } from 'lucide-react';

import { themeClasses } from '@/theme/themeClasses';

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className={`${themeClasses.panel} relative mx-4 w-full max-w-md rounded-2xl p-6`}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title || 'Confirm'}</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className={`${themeClasses.buttonSecondary} ml-4 inline-flex h-9 w-9 items-center justify-center rounded-lg`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {message ? <p className={`${themeClasses.helperText} mt-3 whitespace-pre-line`}>{message}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`}
            onClick={async () => { await onConfirm(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
