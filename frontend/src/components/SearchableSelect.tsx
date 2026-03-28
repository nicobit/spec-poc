import React, { useEffect, useRef, useState } from 'react';
import { themeClasses } from '@/theme/themeClasses';

type Props = {
  options: string[];
  value?: string | undefined;
  onChange: (v?: string) => void;
  placeholder?: string;
  maxVisible?: number;
};

export default function SearchableSelect({ options, value, onChange, placeholder, maxVisible = 10 }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setInput(value || ''); }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = Array.from(new Set(options.filter(Boolean))).filter((o) => o.toLowerCase().includes((input || '').toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2">
        <input
          placeholder={placeholder}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setOpen(false); onChange(input || undefined); }
            if (e.key === 'Escape') { setOpen(false); }
          }}
          className={`${themeClasses.field} rounded px-2 py-1 text-sm`}
          style={{ minWidth: 120 }}
        />
        <button type="button" className={`${themeClasses.select} rounded px-2 py-1 text-sm`} onClick={() => setOpen((o) => !o)}>
          {value || 'All'}
        </button>
      </div>
      {open && (
        <div className="absolute z-50 mt-1 w-[18rem] max-h-72 overflow-auto rounded border bg-[var(--surface-elevated)] p-1 shadow">
          {filtered.slice(0, maxVisible).map((o) => (
            <div key={o} className="p-1 hover:bg-[var(--surface-hover)] rounded cursor-pointer" onClick={() => { onChange(o); setOpen(false); }}>
              {o}
            </div>
          ))}
          {filtered.length === 0 && <div className="p-1 text-sm text-[var(--text-muted)]">No matches</div>}
          {filtered.length > maxVisible && <div className="p-1 text-sm text-[var(--text-muted)]">...more results, narrow filter</div>}
        </div>
      )}
    </div>
  );
}
