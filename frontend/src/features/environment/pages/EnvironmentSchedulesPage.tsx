import { useState } from 'react';
import { useMsal } from '@azure/msal-react';

import { themeClasses } from '@/theme/themeClasses';

import EnvironmentSchedulesManager from '../components/EnvironmentSchedulesManager';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentSchedulesPage() {
  const { instance } = useMsal();
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  return (
    <EnvironmentPageLayout
      title="Environment schedules"
      description="Create and maintain stage-level schedules for automation, notifications, and postponement."
      loading={loading}
      actions={
        <button
          className={`${themeClasses.buttonSecondary} rounded-lg px-4 py-2 text-sm`}
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          Refresh
        </button>
      }
    >
      <EnvironmentSchedulesManager instance={instance} refreshKey={refreshKey} onLoadingChange={setLoading} />
    </EnvironmentPageLayout>
  );
}
