import { useMsal } from '@azure/msal-react';
import { Plus, RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';

import EnvironmentManageList from '../components/EnvironmentManageList';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentManagePage() {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { ready, isAdmin, roles } = useAuthZ(instance);
  const canEdit = ready && (isAdmin || roles.includes('EnvironmentAdmin') || roles.includes('EnvironmentEditor'));
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <EnvironmentPageLayout
      title="Manage environments"
      description="Browse environments by client, then open details, edit the setup, or manage schedules."
      loading={loading}
      actions={
        <>
          <button
            type="button"
            className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
            onClick={() => setRefreshNonce((value) => value + 1)}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
          {canEdit ? (
            <button
              type="button"
              className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`}
              onClick={() => navigate('/environment/create')}
            >
              <Plus className="h-4 w-4" />
              New environment
            </button>
          ) : null}
        </>
      }
    >
      <EnvironmentManageList instance={instance} refreshNonce={refreshNonce} onLoadingChange={setLoading} />
    </EnvironmentPageLayout>
  );
}
