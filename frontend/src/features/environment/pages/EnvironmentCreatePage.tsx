import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { createEnvironment } from '../api';
import EnvironmentEditorForm from '../components/EnvironmentEditorForm';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import type { EnvironmentStage } from '../api';
import { listClients, type ClientRecord } from '@/features/clients/api';
import { useEffect } from 'react';

export default function EnvironmentCreatePage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientOptions, setClientOptions] = useState<ClientRecord[]>([]);
  const [stages, setStages] = useState<EnvironmentStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  

  useEffect(() => {
    let mounted = true;
    void listClients(instance)
      .then((response) => {
        if (mounted) {
          setClientOptions(response.clients);
        }
      })
      .catch(() => {
        // leave free-text fallback unavailable only when options are missing
      });
    return () => {
      mounted = false;
    };
  }, [instance]);

  const onSave = async () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push('Name is required');
    if (!clientId.trim() && !client.trim()) errors.push('Client is required');
    stages.forEach((s, i) => { if (!s.name || !s.name.trim()) errors.push(`Stage ${i + 1} must have a name`); });
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setError(null);
    try {
      await createEnvironment(instance, { name, client, clientId, stages });
      navigate('/environment');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create environment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <EnvironmentPageLayout title="Create Environment Config" description="Provide basic details and save to create a new environment.">
      <EnvironmentEditorForm
        mode="create"
        name={name}
        client={client}
        clientId={clientId}
        clientOptions={clientOptions}
        stages={stages}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        onNameChange={setName}
        onClientChange={setClient}
        onClientIdChange={setClientId}
        onStagesChange={setStages}
        onCancel={() => navigate('/environment')}
        onSubmit={onSave}
      />
      
    </EnvironmentPageLayout>
  );
}
