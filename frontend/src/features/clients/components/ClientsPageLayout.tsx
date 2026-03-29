import React from 'react';
import PageLoadingBar from '@/components/PageLoadingBar';

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
};

export default function ClientsPageLayout({ title, description, actions, loading = false, children }: Props) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-sm ui-text-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <PageLoadingBar loading={loading} />

      <div className="space-y-4">{children}</div>
    </div>
  );
}
