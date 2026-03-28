import { useMsal } from '@azure/msal-react';

import EnvironmentResourcesManager from '../components/EnvironmentResourcesManager';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentResourcesPage() {
  const { instance } = useMsal();

  return (
    <EnvironmentPageLayout title="Environment Resources" description="Manage the Azure services, recipients, and postponement rules that each environment stage depends on." actions={null}>
      <EnvironmentResourcesManager instance={instance} />
    </EnvironmentPageLayout>
  );
}
