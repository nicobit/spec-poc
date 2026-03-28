import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { getEnvironment, updateEnvironment } from '../api';
import EnvironmentEditorForm from '../components/EnvironmentEditorForm';
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
      <EnvironmentEditorForm
        mode="edit"
        name={name}
        client={client}
        stages={stages}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        onNameChange={setName}
        onClientChange={setClient}
        onStagesChange={setStages}
        onCancel={() => navigate(-1)}
        onSubmit={onSave}
      />
    </EnvironmentPageLayout>
  );
}
