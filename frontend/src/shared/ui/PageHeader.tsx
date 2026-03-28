import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-panel flex flex-col gap-4 rounded-2xl p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

type PageStatCardProps = {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
};

export function PageStatCard({ label, value, detail }: PageStatCardProps) {
  return (
    <div className="ui-panel rounded-2xl p-4">
      <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
      {detail ? <div className="mt-1 text-sm text-[var(--text-secondary)]">{detail}</div> : null}
    </div>
  );
}
