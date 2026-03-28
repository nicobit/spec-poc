import { useMsal } from '@azure/msal-react';
import EnvironmentManageList from '../components/EnvironmentManageList';
import EnvironmentPageLayout from '../components/EnvironmentPageLayout';

export default function EnvironmentManagePage() {
  const { instance } = useMsal();
  return (
    <EnvironmentPageLayout title="Manage Environments" description="List, filter and manage environment records." actions={null}>
      <EnvironmentManageList instance={instance} />
    </EnvironmentPageLayout>
  );
}
