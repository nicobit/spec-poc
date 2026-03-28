import { useMsal } from '@azure/msal-react';

import EnvironmentSchedulesManager from '../components/EnvironmentSchedulesManager';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentSchedulesPage() {
  const { instance } = useMsal();

  return (
    <EnvironmentPageLayout title="Environment Schedules" description="Create and maintain lifecycle schedules separately from the live environment dashboard." actions={null}>
      <EnvironmentSchedulesManager instance={instance} />
    </EnvironmentPageLayout>
  );
}
