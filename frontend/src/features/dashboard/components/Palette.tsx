import { useEffect, useState, type ReactNode } from 'react';

import { WidgetType } from '@/types';
import { getWidgetOptions } from '@/shared/widgets/registry';
import { themeClasses } from '@/theme/themeClasses';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
}

const Palette: React.FC<Props> = ({ open, onClose, onAdd }) => {
  const [options, setOptions] = useState<Array<{ type: WidgetType; label: string; icon: ReactNode }>>(
    [],
  );

  useEffect(() => {
    setOptions(
      getWidgetOptions().map(({ type, title, icon }) => ({
        type,
        label: title,
        icon: icon ?? null,
      })),
    );
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="ui-panel mx-4 w-full max-w-xs overflow-hidden rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ui-divider flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Select Widget</h2>
          <button
            onClick={onClose}
            className={`${themeClasses.iconButton} rounded p-1 focus:outline-none`}
            aria-label="Close"
          >
            x
          </button>
        </header>

        <ul className="max-h-64 overflow-y-auto">
          {options.map(({ type, label, icon }) => (
            <li key={type}>
              <button
                onClick={() => {
                  onAdd(type);
                  onClose();
                }}
                className="flex w-full items-center px-4 py-2 text-left text-[var(--text-primary)] hover:bg-[var(--surface-hover)] focus:outline-none"
              >
                {icon && <span className="mr-3 h-5 w-5">{icon}</span>}
                <span className="flex-1 text-sm font-medium capitalize">{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Palette;
