import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useAuthZ } from '@/auth/useAuthZ';
import { themeClasses } from '@/theme/themeClasses';
import EnvironmentSummary from '@/features/dashboard/components/EnvironmentSummary';

export default function EnvironmentPage() {
  const { instance } = useMsal();
  const { ready: authReady, isAdmin, roles } = useAuthZ(instance);
  const canManage = authReady && (isAdmin || roles.includes('EnvironmentAdmin') || roles.includes('EnvironmentEditor'));

  return (
    <div className="space-y-6">
      <PageHeader title="Environments" description="Environment listing, lifecycle and resource configuration are managed from the Environments area." />
      <EnvironmentSummary />
      <div className="ui-panel rounded-2xl p-4">
        <p className="text-sm ui-text-muted">To manage environments (create, edit stages, configure resources and schedules), go to the dedicated Environments management page.</p>
        <div className="mt-4">
          {canManage ? (
            <Link to="/environment/manage" className={`${themeClasses.buttonPrimary} rounded-lg px-3 py-1.5 text-sm`}>
              Open Environments management
            </Link>
          ) : (
            <p className="text-sm ui-text-muted">You do not have permissions to manage environments.</p>
          )}
        </div>
      </div>
    </div>
  );
}
