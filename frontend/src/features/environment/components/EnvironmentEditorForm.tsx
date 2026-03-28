import { Layers, Server, Sparkles } from 'lucide-react';

import { themeClasses } from '@/theme/themeClasses';

import type { EnvironmentStage, ResourceAction } from '../api';
import StageEditor from './StageEditor';

type Props = {
  mode: 'create' | 'edit';
  name: string;
  client: string;
  lifecycle?: string;
  stages: EnvironmentStage[];
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  onNameChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onLifecycleChange?: (value: string) => void;
  onStagesChange: (stages: EnvironmentStage[]) => void;
  onCancel: () => void;
  onSubmit: () => void;
};

function getResourceTypeLabel(type: ResourceAction['type']) {
  switch (type) {
    case 'sql-vm':
      return 'SQL VM';
    case 'sql-managed-instance':
      return 'SQL Managed Instance';
    case 'synapse-sql-pool':
      return 'Synapse SQL Pool';
    case 'service-bus-message':
      return 'Service Bus';
    default:
      return type;
  }
}

function deriveEnvironmentTypes(stages: EnvironmentStage[]) {
  const types = Array.from(
    new Set(
      stages.flatMap((stage) => (stage.resourceActions || []).map((resource) => getResourceTypeLabel(resource.type))),
    ),
  );

  return types;
}

export default function EnvironmentEditorForm({
  mode,
  name,
  client,
  lifecycle,
  stages,
  saving,
  error,
  validationErrors,
  onNameChange,
  onClientChange,
  onLifecycleChange,
  onStagesChange,
  onCancel,
  onSubmit,
}: Props) {
  const derivedTypes = deriveEnvironmentTypes(stages);
  const resourceCount = stages.reduce((count, stage) => count + (stage.resourceActions?.length || 0), 0);
  const actionLabel = mode === 'create' ? 'Create' : 'Save';

  return (
    <div className="space-y-5">
      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {validationErrors.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <div className="font-medium">Please complete the required fields before continuing.</div>
          <ul className="mt-2 space-y-1">
            {validationErrors.map((validationError) => (
              <li key={validationError}>{validationError}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(18rem,0.8fr)]">
        <div className="ui-panel rounded-2xl p-5">
          <div className="mb-4">
            <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Environment details</div>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Start with the basic identity for the environment, then define the stages and resources below.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="environment-name" className="block text-sm font-medium text-[var(--text-primary)]">
                Name
              </label>
              <input
                id="environment-name"
                className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                value={name}
                onChange={(event) => onNameChange(event.target.value)}
                placeholder="client01-dev"
              />
            </div>

            <div>
              <label htmlFor="environment-client" className="block text-sm font-medium text-[var(--text-primary)]">
                Client
              </label>
              <input
                id="environment-client"
                className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                value={client}
                onChange={(event) => onClientChange(event.target.value)}
                placeholder="CLIENT 1"
              />
            </div>

            {onLifecycleChange ? (
              <div className="md:col-span-2 lg:max-w-xs">
                <label htmlFor="environment-lifecycle" className="block text-sm font-medium text-[var(--text-primary)]">
                  Lifecycle
                </label>
                <input
                  id="environment-lifecycle"
                  className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                  value={lifecycle || ''}
                  onChange={(event) => onLifecycleChange(event.target.value)}
                  placeholder="DEV"
                />
              </div>
            ) : null}
          </div>
        </div>

        <aside className="ui-panel rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.18em] ui-text-muted">Configuration summary</div>
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[var(--surface-panel-muted)] p-2">
                <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{stages.length} stage{stages.length === 1 ? '' : 's'}</div>
                <div className="text-sm text-[var(--text-secondary)]">Model each operating step as its own stage.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[var(--surface-panel-muted)] p-2">
                <Server className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{resourceCount} resource action{resourceCount === 1 ? '' : 's'}</div>
                <div className="text-sm text-[var(--text-secondary)]">Add only the Azure resources needed for this environment.</div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[var(--surface-panel-muted)] p-2">
                <Sparkles className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">Derived type</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {derivedTypes.length > 0 ? (
                    derivedTypes.map((type) => (
                      <span
                        key={type}
                        className="rounded-full bg-[var(--surface-panel-muted)] px-2.5 py-1 text-xs text-[var(--text-secondary)]"
                      >
                        {type}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-[var(--text-secondary)]">No resource types yet. This will be derived from the stage resources.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="ui-panel rounded-2xl p-5">
        <StageEditor stages={stages} onChange={onStagesChange} />
      </section>

      <div className="ui-panel sticky bottom-4 flex items-center justify-between rounded-2xl px-5 py-4">
        <div className="text-sm text-[var(--text-secondary)]">
          {mode === 'create'
            ? 'Create the environment once the required details and stage configuration are ready.'
            : 'Save your changes once the environment details and stage configuration are correct.'}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`${themeClasses.buttonSecondary} rounded-lg px-3 py-1.5 text-sm`}
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={onSubmit}
            disabled={saving}
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
