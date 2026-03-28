import { useMsal } from "@azure/msal-react";
import HealthStatusDashboard from "../components/HealthStatusDashboard";

export default function StatusPage() {
  const { instance } = useMsal();

  return (
    <div className="grid h-full gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-full h-full">
        <HealthStatusDashboard instance={instance} />
      </div>
    </div>
  );
}
