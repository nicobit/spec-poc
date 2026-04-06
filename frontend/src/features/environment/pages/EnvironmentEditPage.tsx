import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { getEnvironment, updateEnvironment } from '../api';
import EnvironmentEditorForm from '../components/EnvironmentEditorForm';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';
import type { EnvironmentStage } from '../api';
import { listClients, type ClientRecord } from '@/features/clients/api';

export default function EnvironmentEditPage() {
  const { instance } = useMsal();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientOptions, setClientOptions] = useState<ClientRecord[]>([]);
  const [stages, setStages] = useState<EnvironmentStage[]>([]);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [env, clients] = await Promise.all([getEnvironment(instance, id!), listClients(instance)]);
        if (!mounted) return;
        setName(env.name || '');
        setClient(env.client || '');
        setClientId(env.clientId || '');
        setStages(env.stages || []);
        setClientOptions(clients.clients || []);
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
    if (!clientId.trim() && !client.trim()) errors.push('Client is required');
    stages.forEach((s, i) => { if (!s.name || !s.name.trim()) errors.push(`Stage ${i + 1} must have a name`); });
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    setError(null);
    try {
    await updateEnvironment(instance, id!, { name, client, clientId, stages });
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
    <EnvironmentPageLayout title="Edit environment" description="Update the client, stages, and Azure services for this environment.">
      <EnvironmentEditorForm
        mode="edit"
        name={name}
        client={client}
        clientId={clientId}
        clientOptions={clientOptions}
        stages={stages}
        saving={saving}
        error={error}
        validationErrors={validationErrors}
        msalInstance={instance}
        onNameChange={setName}
        onClientChange={setClient}
        onClientIdChange={setClientId}
        onStagesChange={setStages}
        onCancel={() => navigate(-1)}
        onSubmit={onSave}
      />
    </EnvironmentPageLayout>
  );
}
