import { enqueueSnackbar } from 'notistack';
import { useMsal } from '@azure/msal-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuthZ } from '@/auth/useAuthZ';

import { getClient, updateClient, type ClientRecord } from '../api';
import ClientEditorForm from '../components/ClientEditorForm';
import ClientsPageLayout from '../components/ClientsPageLayout';

export default function ClientEditPage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { ready, isAdmin, roles } = useAuthZ(instance);
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const normalizedRoles = roles.map((role) => (role || '').toLowerCase());
  const isEnvironmentManager =
    normalizedRoles.includes('environmentmanager') || normalizedRoles.includes('environment-manager');
  const canManage = ready && (isAdmin || isEnvironmentManager);

  useEffect(() => {
    let cancelled = false;
    if (!id || !canManage) {
      setLoading(false);
      return;
    }
    void getClient(instance, id)
      .then((item) => {
        if (!cancelled) {
          setClient(item);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          enqueueSnackbar(err instanceof Error ? err.message : 'Failed to load client', { variant: 'error' });
          navigate('/clients');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, id, instance, navigate]);

  if (ready && !canManage) {
    return (
      <ClientsPageLayout title="Edit client" description="Update the canonical client record.">
        <div className="ui-empty-state rounded-3xl px-5 py-8 text-sm">You do not have access to client management.</div>
      </ClientsPageLayout>
    );
  }

  if (loading) {
    return (
      <ClientsPageLayout title="Edit client" description="Update the canonical client record.">
        <div className="ui-empty-state rounded-3xl px-5 py-8 text-sm">Loading client…</div>
      </ClientsPageLayout>
    );
  }

  if (!client || !id) {
    return null;
  }

  return (
    <ClientsPageLayout title="Edit client" description="Update the canonical client identity, ownership, and business context.">
      <ClientEditorForm
        title="Edit client"
        description="Keep the client record accurate so environments, schedules, and future domains all reuse the same business identity."
        initialValue={client}
        submitLabel="Save"
        saving={saving}
        onCancel={() => navigate('/clients')}
        onSubmit={async (value) => {
          try {
            setSaving(true);
            await updateClient(instance, id, value);
            enqueueSnackbar('Client updated', { variant: 'success' });
            navigate('/clients');
          } catch (err) {
            enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update client', { variant: 'error' });
          } finally {
            setSaving(false);
          }
        }}
      />
    </ClientsPageLayout>
  );
}
