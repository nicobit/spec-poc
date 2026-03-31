import { useMsal } from '@azure/msal-react';

import EnvironmentDashboard from '../components/EnvironmentDashboard';

export default function EnvironmentPage() {
  const { instance } = useMsal();

  return <EnvironmentDashboard instance={instance} />;
}
