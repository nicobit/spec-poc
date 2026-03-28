import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { createEnvironment } from '../api';
import { themeClasses } from '@/theme/themeClasses';
import StageEditor from '../components/StageEditor';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import type { EnvironmentStage } from '../api';

export default function EnvironmentCreatePage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [lifecycle, setLifecycle] = useState('DEV');
  const [stages, setStages] = useState<EnvironmentStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const onSave = async () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!client.trim()) errors.push('Client is required');
    stages.forEach((s, i) => { if (!s.name || !s.name.trim()) errors.push(`Stage ${i + 1} must have a name`); });
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await createEnvironment(instance, { name, client, lifecycle, stages });
      navigate('/environment');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create environment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnvironmentPageLayout title="Create Environment" description="Provide basic details and save to create a new environment.">
      <div className="ui-panel rounded-2xl p-6 w-full max-w-none">
        {error ? <div className="mb-3 text-sm text-red-600">{error}</div> : null}
        {validationErrors.length > 0 ? (
          <div className="mb-3 text-sm text-red-600">
            <ul className="list-disc list-inside">
              {validationErrors.map((ve) => (
                <li key={ve}>{ve}</li>
              ))}
            </ul>
          </div>
        ) : null}
          <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium"><svg className="inline -mt-0.5 mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Name</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium"><svg className="inline -mt-0.5 mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Client</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={client} onChange={(e) => setClient(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Type</label>
            <div className="mt-1 text-sm ui-text-muted">Derived from stage resource types.</div>
          </div>
          <div>
            <label className="block text-sm font-medium">Lifecycle</label>
            <input className={`${themeClasses.field} mt-1 w-full`} value={lifecycle} onChange={(e) => setLifecycle(e.target.value)} />
          </div>
          <div>
            <StageEditor stages={stages} onChange={setStages} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
            <button className={`${themeClasses.buttonSecondary} rounded px-3 py-1.5 text-sm`} onClick={() => navigate('/environment')} disabled={saving}>Cancel</button>
            <button className={`${themeClasses.buttonPrimary} rounded px-3 py-1.5 text-sm`} onClick={onSave} disabled={saving}>Create</button>
          </div>
      </div>
    </EnvironmentPageLayout>
  );
}
