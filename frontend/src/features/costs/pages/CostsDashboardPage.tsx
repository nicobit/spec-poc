import { useMsal } from "@azure/msal-react";

import CostsDashboard from "../components/CostsDashboard";

export default function CostsDashboardPage() {
  const { instance } = useMsal();

  return (
    <div className="grid h-full gap-6 md:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-full h-full">
        <CostsDashboard instance={instance} />
      </div>
    </div>
  );
}
