import React from 'react';
import { themeClasses } from '@/theme/themeClasses';

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

export default function EnvironmentPageLayout({ title, description, actions, children }: Props) {
  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{title}</h1>
          {description ? <p className="text-sm ui-text-muted">{description}</p> : null}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      <div className="space-y-4">{children}</div>
    </div>
  );
}
