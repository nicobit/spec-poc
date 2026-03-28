import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="ui-panel rounded-2xl">
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return (
    <div className="ui-divider border-b px-4 py-3">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{children}</h3>
  );
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3">{children}</div>;
}
