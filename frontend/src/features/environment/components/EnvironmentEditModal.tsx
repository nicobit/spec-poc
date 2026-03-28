import { useState, useEffect } from 'react';
import { IPublicClientApplication } from '@azure/msal-browser';
import { EnvInstance, updateEnvironment } from '../api';
import { themeClasses } from '@/theme/themeClasses';
import StageEditor from './StageEditor';
import type { EnvironmentStage } from '../api';

type Props = {
  open: boolean;
  env: EnvInstance | null;
  instance: IPublicClientApplication;
  onClose: (updated?: EnvInstance) => void;
};

export default function EnvironmentEditModal({ open, env, instance, onClose }: Props) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [stages, setStages] = useState<EnvironmentStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  useEffect(() => {
    if (env) {
      setName(env.name || '');
      setClient(env.client || '');
      setStages(env.stages || []);
    }
  }, [env]);

  if (!open || !env) return null;

  const onSave = async () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!client.trim()) errors.push('Client is required');
    stages.forEach((s, i) => { if (!s.name || !s.name.trim()) errors.push(`Stage ${i + 1} must have a name`); });
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const updated = await updateEnvironment(instance, env.id, { name, client, stages });
      onClose(updated);
    } catch (e) {
      // swallow, parent will show error
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => onClose()} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="text-lg font-medium mb-3">Edit environment</h3>
        <div className="space-y-3">
          {validationErrors.length > 0 ? (
            <div className="mb-2 text-sm text-red-600">
              <ul className="list-disc list-inside">
                {validationErrors.map((ve) => (
                  <li key={ve}>{ve}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium">Name</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Client</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Type</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={type} onChange={(e) => setType(e.target.value)} />
          </div>
          <div>
            <StageEditor stages={stages} onChange={setStages} />
          </div>
          <div className="mt-4">
            <h4 className="text-md font-semibold">Stage metadata</h4>
            <div className="space-y-3 mt-3">
              {stages.map((s, idx) => (
                <div key={s.id} className="ui-panel p-3 rounded">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs ui-text-muted">ID: {s.id}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Description</span>
                      <input aria-label={`Stage ${idx + 1} description`} className={`${themeClasses.field} mt-1`} value={(s as any).description || ''} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, description: e.target.value } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Owner (team)</span>
                      <input aria-label={`Stage ${idx + 1} owner team`} className={`${themeClasses.field} mt-1`} value={(s as any).owner?.team || ''} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, owner: { ...(it as any).owner, team: e.target.value } } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Owner contact</span>
                      <input aria-label={`Stage ${idx + 1} owner contact`} className={`${themeClasses.field} mt-1`} value={(s as any).owner?.contact || ''} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, owner: { ...(it as any).owner, contact: e.target.value } } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Tags (comma separated)</span>
                      <input aria-label={`Stage ${idx + 1} tags`} className={`${themeClasses.field} mt-1`} value={((s as any).tags || []).join(', ')} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Runbook URL</span>
                      <input aria-label={`Stage ${idx + 1} runbook`} className={`${themeClasses.field} mt-1`} value={(s as any).runbookUrl || ''} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, runbookUrl: e.target.value } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Notification recipients (comma separated)</span>
                      <input aria-label={`Stage ${idx + 1} notifications`} className={`${themeClasses.field} mt-1`} value={(s.notificationGroups && s.notificationGroups[0]) ? (s.notificationGroups[0].recipients || []).join(', ') : ''} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, notificationGroups: e.target.value.split(',').map((r) => r.trim()).filter(Boolean).length ? [{ name: ((it.notificationGroups && it.notificationGroups[0]) ? it.notificationGroups[0].name : 'Operations'), recipients: e.target.value.split(',').map((r) => r.trim()).filter(Boolean) }] : [] } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Max postpone minutes</span>
                      <input type="number" aria-label={`Stage ${idx + 1} max postpone minutes`} className={`${themeClasses.field} mt-1`} value={String((s.postponementPolicy && (s.postponementPolicy as any).maxPostponeMinutes) ?? '')} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, postponementPolicy: { ...(it.postponementPolicy || {}), maxPostponeMinutes: Number(e.target.value) } } as EnvironmentStage) : it))} />
                    </label>

                    <label className="flex flex-col text-sm">
                      <span className="text-[var(--text-secondary)]">Max postponements</span>
                      <input type="number" aria-label={`Stage ${idx + 1} max postponements`} className={`${themeClasses.field} mt-1`} value={String((s.postponementPolicy && (s.postponementPolicy as any).maxPostponements) ?? '')} onChange={(e) => setStages(prev => prev.map((it, i) => i === idx ? ({ ...it, postponementPolicy: { ...(it.postponementPolicy || {}), maxPostponements: Number(e.target.value) } } as EnvironmentStage) : it))} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button className={`${themeClasses.buttonSecondary} rounded px-3 py-1.5 text-sm`} onClick={() => onClose()} disabled={saving}>Cancel</button>
          <button className={`${themeClasses.buttonPrimary} rounded px-3 py-1.5 text-sm`} onClick={onSave} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}
