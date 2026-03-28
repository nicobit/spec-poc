import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { createEnvironment } from '../api';
import EnvironmentEditorForm from '../components/EnvironmentEditorForm';
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
      <EnvironmentEditorForm
        mode="create"
        name={name}
        client={client}
        lifecycle={lifecycle}
        stages={stages}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        onNameChange={setName}
        onClientChange={setClient}
        onLifecycleChange={setLifecycle}
        onStagesChange={setStages}
        onCancel={() => navigate('/environment')}
        onSubmit={onSave}
      />
    </EnvironmentPageLayout>
  );
}
