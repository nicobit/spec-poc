import { Layers, Server, Sparkles } from 'lucide-react';

import { themeClasses } from '@/theme/themeClasses';
import type { ClientRecord } from '@/features/clients/api';

import type { EnvironmentStage, ResourceAction } from '../api';
import StageEditor from './StageEditor';

type Props = {
  mode: 'create' | 'edit';
  name: string;
  client: string;
  clientId?: string;
  clientOptions?: ClientRecord[];
  lifecycle?: string;
  stages: EnvironmentStage[];
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  onNameChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onClientIdChange?: (value: string) => void;
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
  clientId,
  clientOptions = [],
  lifecycle,
  stages,
  saving,
  error,
  validationErrors,
  onNameChange,
  onClientChange,
  onClientIdChange,
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

      <section className="space-y-4">
        <div className={`${themeClasses.formSection} rounded-3xl p-6`}>
          <div className="mb-4">
            <div className={themeClasses.sectionEyebrow}>Environment details</div>
            <p className={`${themeClasses.helperText} mt-2 max-w-3xl`}>
              Start with the client and environment identity, then define the stages and Azure services below.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="environment-name" className={`block ${themeClasses.fieldLabel}`}>
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
              <label htmlFor="environment-client" className={`block ${themeClasses.fieldLabel}`}>
                Client
              </label>
              {clientOptions.length > 0 && onClientIdChange ? (
                <select
                  id="environment-client"
                  className={`${themeClasses.select} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                  value={clientId || ''}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    const selectedClient = clientOptions.find((option) => option.id === nextId);
                    onClientIdChange(nextId);
                    onClientChange(selectedClient?.name || '');
                  }}
                >
                  <option value="">Select a client</option>
                  {clientOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.shortCode} - {option.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="environment-client"
                  className={`${themeClasses.field} mt-1 w-full rounded-lg px-3 py-2 text-sm`}
                  value={client}
                  onChange={(event) => onClientChange(event.target.value)}
                  placeholder="CLIENT 1"
                />
              )}
            </div>

            {onLifecycleChange ? (
              <div className="md:col-span-2 lg:max-w-xs">
                <label htmlFor="environment-lifecycle" className={`block ${themeClasses.fieldLabel}`}>
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

        <aside className={`${themeClasses.formSection} rounded-3xl p-6`}>
          <div className={themeClasses.sectionEyebrow}>Configuration summary</div>
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            <div className={`${themeClasses.subsectionCard} flex items-start gap-3 rounded-2xl p-4`}>
              <div className="rounded-xl bg-[var(--surface-elevated)] p-2">
                <Layers className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{stages.length} stage{stages.length === 1 ? '' : 's'}</div>
                <div className={themeClasses.helperText}>Model each operating step as its own stage.</div>
              </div>
            </div>

            <div className={`${themeClasses.subsectionCard} flex items-start gap-3 rounded-2xl p-4`}>
              <div className="rounded-xl bg-[var(--surface-elevated)] p-2">
                <Server className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">{resourceCount} Azure service action{resourceCount === 1 ? '' : 's'}</div>
                <div className={themeClasses.helperText}>Add only the Azure services needed for this environment.</div>
              </div>
            </div>

            <div className={`${themeClasses.subsectionCard} flex items-start gap-3 rounded-2xl p-4`}>
              <div className="rounded-xl bg-[var(--surface-elevated)] p-2">
                <Sparkles className="h-4 w-4 text-[var(--text-secondary)]" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)]">Service types</div>
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
                    <span className={themeClasses.helperText}>No service types yet. This will be derived from the Azure services configured for each stage.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <StageEditor stages={stages} onChange={onStagesChange} />
      </section>

      <div className={`${themeClasses.formSection} sticky bottom-4 flex items-center justify-between rounded-3xl px-6 py-4`}>
        <div className={themeClasses.helperText}>
          {mode === 'create'
            ? 'Create the environment once the client, stages, and Azure services are ready.'
            : 'Save your changes once the environment details, stages, and Azure services are correct.'}
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
