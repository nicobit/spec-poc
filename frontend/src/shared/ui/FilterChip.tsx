import React from "react";
import { themeClasses } from "@/theme/themeClasses";

export interface FilterChipProps {
  label: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const cx = (...parts: Array<string | false | undefined>) => parts.filter(Boolean).join(" ");

export default function FilterChip({
  label,
  active = false,
  onClick,
  className,
  disabled = false,
  ariaLabel,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border focus:outline-none transition-colors",
        active
          ? "ui-button-primary border-transparent"
          : `${themeClasses.buttonSecondary} hover:bg-[var(--surface-hover)]`,
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {label}
    </button>
  );
}

export type { FilterChipProps as TFilterChipProps };
