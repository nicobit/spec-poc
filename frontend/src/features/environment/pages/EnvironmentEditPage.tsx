import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { getEnvironment, updateEnvironment } from '../api';
import { themeClasses } from '@/theme/themeClasses';
import StageEditor from '../components/StageEditor';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import type { EnvironmentStage } from '../api';

export default function EnvironmentEditPage() {
  const { instance } = useMsal();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [stages, setStages] = useState<EnvironmentStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const env = await getEnvironment(instance, id!);
        if (!mounted) return;
        setName(env.name || '');
        setClient(env.client || '');
        setStages(env.stages || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load environment');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id, instance]);

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
    await updateEnvironment(instance, id!, { name, client, stages });
      // return to manage preserving search params if present
      const returnTo = (location.state as any)?.from || '/environment/manage';
      navigate(returnTo + (location.search || ''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update environment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="ui-panel-muted rounded-xl p-3 text-sm">Loading environment...</div>;

  return (
    <EnvironmentPageLayout title="Edit Environment" description="Update details and save.">
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
            <StageEditor stages={stages} onChange={setStages} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button className={`${themeClasses.buttonSecondary} rounded px-3 py-1.5 text-sm`} onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
          <button className={`${themeClasses.buttonPrimary} rounded px-3 py-1.5 text-sm`} onClick={onSave} disabled={saving}>Save</button>
        </div>
      </div>
    </EnvironmentPageLayout>
  );
}
