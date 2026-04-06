import { useState, useEffect, useRef } from 'react';
import type { IPublicClientApplication } from '@azure/msal-browser';
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
  stages: EnvironmentStage[];
  saving: boolean;
  error: string | null;
  validationErrors: string[];
  msalInstance: IPublicClientApplication;
  onNameChange: (value: string) => void;
  onClientChange: (value: string) => void;
  onClientIdChange?: (value: string) => void;
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
  stages,
  saving,
  msalInstance,
  error,
  validationErrors,
  onNameChange,
  onClientChange,
  onClientIdChange,
  onStagesChange,
  onCancel,
  onSubmit,
}: Props) {
  const [showSummary, setShowSummary] = useState(false);
  const [stageBladeOpen, setStageBladeOpen] = useState(false);

  // Reference to the portal container so we can compute its position once
  // the width transition has started and then scroll the nearest scrollable
  // viewport so the blade becomes visible. This is more robust than a fixed
  // pixel scroll and works inside nested scrolling layouts.
  const bladeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bladeRef.current) return;

    let cancelled = false;

    if (stageBladeOpen) {
      // Wait for the width transition to begin so the portal has non-zero
      // layout. 200ms is conservative relative to the 300ms CSS duration.
      const t = setTimeout(() => {
        if (cancelled || !bladeRef.current) return;

        // Compute the blade's right edge relative to the document.
        const bladeRect = bladeRef.current.getBoundingClientRect();
        const bladeRight = bladeRect.left + bladeRect.width + window.scrollX;
        const viewportRight = window.innerWidth + window.scrollX;

        // If the blade's right edge is outside the viewport, scroll so it's visible.
        if (bladeRight > viewportRight) {
          const delta = bladeRight - viewportRight + 16; // small padding
          window.scrollBy({ left: delta, behavior: 'smooth' });
        }
      }, 120);

      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }

    // When closing, try to scroll back left by the blade width so the main
    // form becomes the primary view again. Use the blade width if available.
    const closeWidth = bladeRef.current.offsetWidth || 680;
    window.scrollBy({ left: -closeWidth, behavior: 'smooth' });
  }, [stageBladeOpen]);

  const derivedTypes = deriveEnvironmentTypes(stages);
  const resourceCount = stages.reduce((count, stage) => count + (stage.resourceActions?.length || 0), 0);
  const actionLabel = mode === 'create' ? 'Create' : 'Save';

  return (
    <div className="relative flex items-start w-full">
    {/* When the blade (sidebar) opens we split the area 50/50. When closed the
        sidebar width is 0 so the main area remains full width. This keeps the
        page width constant — the main area is responsively reduced to 50%.
    */}
    <div
      className={
        stageBladeOpen
          ? 'w-1/2 flex-none space-y-5 transition-[width] duration-300'
          : 'w-full flex-none space-y-5 transition-[width] duration-300'
      }
    >
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
                      {option.name}
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
          </div>
        </div>

        <aside className={`${themeClasses.formSection} rounded-3xl p-6`}>
          <div className="flex items-center justify-between">
            <div className={themeClasses.sectionEyebrow}>Configuration summary</div>
            <button
              type="button"
              className="text-sm text-sky-600 hover:underline"
              onClick={() => setShowSummary((s) => !s)}
            >
              {showSummary ? 'Hide' : 'Show'}
            </button>
          </div>

          {showSummary ? (
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
        ) : (
          <div className="mt-3 flex items-center justify-between">
            <div className="text-sm">
              <strong>{stages.length}</strong> stage{stages.length === 1 ? '' : 's'}, <strong>{resourceCount}</strong> service action{resourceCount === 1 ? '' : 's'}
            </div>
            <div className={themeClasses.helperText}>Click Show to view full configuration summary</div>
          </div>
        )}
        </aside>
      </section>

      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <StageEditor stages={stages} onChange={onStagesChange} msalInstance={msalInstance} onBladeOpenChange={setStageBladeOpen} />
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
    <div
      id="stage-blade-portal"
      className={`flex-none overflow-hidden transition-[width] duration-300 ${stageBladeOpen ? 'w-1/2' : 'w-0'}`}
    />
    </div>
  );
}
