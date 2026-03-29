import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { themeClasses } from '@/theme/themeClasses';

type Props = {
  options: string[];
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  maxVisible?: number;
  emptyText?: string;
  inputClassName?: string;
};

export default function ConstrainedSearchInput({
  options,
  value,
  onChange,
  placeholder,
  maxVisible = 10,
  emptyText = 'No matches',
  inputClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    setInput(value || '');
  }, [value]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !inputRef.current) {
      setDropdownStyle(null);
      return;
    }

    const updatePosition = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function onDocumentMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      const inField = ref.current?.contains(target);
      const inPopup = popupRef.current?.contains(target);
      if (!inField && !inPopup) {
        setOpen(false);
        setInput(value || '');
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, [value]);

  const normalizedOptions = useMemo(() => Array.from(new Set(options.filter(Boolean))).sort(), [options]);
  const filtered = useMemo(
    () => normalizedOptions.filter((option) => option.toLowerCase().includes((input || '').toLowerCase())),
    [input, normalizedOptions],
  );
  const visibleOptions = filtered.slice(0, maxVisible);

  const commitValue = (nextValue?: string) => {
    onChange(nextValue || undefined);
    setInput(nextValue || '');
    setOpen(false);
    setHighlightedIndex(-1);
  };

  const exactMatch = normalizedOptions.find((option) => option.toLowerCase() === input.trim().toLowerCase());

  useEffect(() => {
    if (highlightedIndex < 0) return;
    const target = optionRefs.current[highlightedIndex];
    target?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  return (
    <div ref={ref} className="relative">
      <input
        ref={inputRef}
        className={`${themeClasses.field} ${inputClassName || ''} w-full rounded-lg px-3 py-2 text-sm`}
        placeholder={placeholder}
        value={input}
        onFocus={() => {
          setOpen(true);
          setHighlightedIndex(visibleOptions.length > 0 ? 0 : -1);
        }}
        onChange={(event) => {
          setInput(event.target.value);
          setOpen(true);
          setHighlightedIndex(0);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setInput(value || '');
            setOpen(false);
            setHighlightedIndex(-1);
          }, 120);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((current) => {
              if (visibleOptions.length === 0) return -1;
              if (current < 0) return 0;
              return Math.min(current + 1, visibleOptions.length - 1);
            });
            return;
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setOpen(true);
            setHighlightedIndex((current) => {
              if (visibleOptions.length === 0) return -1;
              if (current < 0) return visibleOptions.length - 1;
              return Math.max(current - 1, 0);
            });
            return;
          }

          if (event.key === 'Enter') {
            event.preventDefault();
            if (highlightedIndex >= 0 && visibleOptions[highlightedIndex]) {
              commitValue(visibleOptions[highlightedIndex]);
            } else if (exactMatch) {
              commitValue(exactMatch);
            } else {
              setInput(value || '');
              setOpen(false);
              setHighlightedIndex(-1);
            }
          }
          if (event.key === 'Escape') {
            setInput(value || '');
            setOpen(false);
            setHighlightedIndex(-1);
          }
        }}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls="constrained-search-input-listbox"
      />

      {open && dropdownStyle
        ? createPortal(
            <div
              id="constrained-search-input-listbox"
              role="listbox"
              ref={popupRef}
              className="fixed z-[9999] max-h-72 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1 shadow-2xl"
              style={{ top: dropdownStyle.top, left: dropdownStyle.left, width: dropdownStyle.width, minWidth: '18rem' }}
            >
              {visibleOptions.map((option, index) => (
                <button
                  key={option}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === index}
                  className={`block w-full rounded px-2 py-1.5 text-left text-sm text-[var(--text-primary)] ${
                    highlightedIndex === index ? 'bg-[var(--surface-hover)]' : 'hover:bg-[var(--surface-hover)]'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => commitValue(option)}
                >
                  {option}
                </button>
              ))}
              {filtered.length === 0 ? <div className="px-2 py-1.5 text-sm text-[var(--text-muted)]">{emptyText}</div> : null}
              {filtered.length > maxVisible ? (
                <div className="px-2 py-1.5 text-sm text-[var(--text-muted)]">...more results, keep typing</div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
