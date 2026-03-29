import { enqueueSnackbar } from 'notistack';
import { useMsal } from '@azure/msal-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

import { useAuthZ } from '@/auth/useAuthZ';

import { createClient } from '../api';
import ClientEditorForm from '../components/ClientEditorForm';
import ClientsPageLayout from '../components/ClientsPageLayout';

export default function ClientCreatePage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { ready, isAdmin, roles } = useAuthZ(instance);
  const [saving, setSaving] = useState(false);
  const normalizedRoles = roles.map((role) => (role || '').toLowerCase());
  const isEnvironmentManager =
    normalizedRoles.includes('environmentmanager') || normalizedRoles.includes('environment-manager');
  const canManage = ready && (isAdmin || isEnvironmentManager);

  if (ready && !canManage) {
    return (
      <ClientsPageLayout title="Create client" description="Create a canonical client record for reuse across environments, schedules, and future domains.">
        <div className="ui-empty-state rounded-3xl px-5 py-8 text-sm">You do not have access to client management.</div>
      </ClientsPageLayout>
    );
  }

  return (
    <ClientsPageLayout title="Create client" description="Create a canonical client record for reuse across environments, schedules, and future domains.">
      <ClientEditorForm
        title="Create client"
        description="Capture the minimum reusable client identity: display name, short code, country, timezone, and client-admin ownership."
        submitLabel="Create client"
        saving={saving}
        onCancel={() => navigate('/clients')}
        onSubmit={async (value) => {
          try {
            setSaving(true);
            await createClient(instance, value);
            enqueueSnackbar('Client created', { variant: 'success' });
            navigate('/clients');
          } catch (err) {
            enqueueSnackbar(err instanceof Error ? err.message : 'Failed to create client', { variant: 'error' });
          } finally {
            setSaving(false);
          }
        }}
      />
    </ClientsPageLayout>
  );
}
