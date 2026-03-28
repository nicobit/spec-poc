// components/CustomNode.tsx
import { memo } from 'react';
import { Handle, Position } from 'reactflow';


function getAzureIconForType(type: string): string {
  
  const fallbackIcon = "Default.svg";

  // Static list of icon filenames (you can load this dynamically if needed)
  const typeToIconMap: { [key: string]: string } = {
    "Microsoft.KeyVault/vaults": "Key-Vaults.svg",
    "Microsoft.Storage/storageAccounts": "Storage-Accounts.svg",
    "Microsoft.MachineLearningServices/workspaces": "Machine-Learning.svg",
    "Microsoft.Web/sites": "App-Services.svg",
    "Microsoft.Web/serverFarms":"App-Service-Plans.svg",
    "Microsoft.Search/searchServices": "Cognitive-Search.svg",
    "Microsoft.Logic/workflows": "Logic-Apps.svg",
    "Microsoft.OperationalInsights/workspaces": "Log-Analytics-Workspaces.svg",
    "Microsoft.Sql/servers/databases": "SQL-Database.svg",
    "Microsoft.Sql/servers": "SQL-Server.svg",
    "Microsoft.CognitiveServices/accounts": "Cognitive-Services.svg",

    "Microsoft.Compute/virtualMachines/extensions": "Virtual Machine Extension.svg",
    "Microsoft.Sql/managedInstances": "SQL Managed Instance.svg",
    "Microsoft.Compute/virtualMachines": "Virtual Machine.svg",
    "Microsoft.Network/virtualNetworks": "Virtual Network.svg",
    "Microsoft.Network/networkInterfaces": "Network Interface.svg",
    "Microsoft.Network/publicIPAddresses": "Public IP Address.svg",
    "Microsoft.Network/loadBalancers": "Load Balancer.svg",
    "Microsoft.Network/applicationGateways": "Application Gateway.svg",
    "Microsoft.Network/networkSecurityGroups": "Network Security Group.svg",
    "Microsoft.DocumentDB/databaseAccounts": "Cosmos DB.svg",
    "Microsoft.EventHub/namespaces": "Event Hubs.svg",
    "Microsoft.ServiceBus/namespaces": "Service Bus.svg",
    "Microsoft.ContainerInstance/containerGroups": "Container Instances.svg",
    "Microsoft.ContainerRegistry/registries": "Container Registry.svg",
    "Microsoft.ContainerService/managedClusters": "Kubernetes Services.svg",
    "Microsoft.Insights/components": "Application Insights.svg",
    "Microsoft.Automation/automationAccounts": "Automation Account.svg",
    "Microsoft.Media/mediaservices": "Media Services.svg",
    "Microsoft.Devices/IotHubs": "IoT Hub.svg",
    "Microsoft.StreamAnalytics/streamingjobs": "Stream Analytics.svg",
    "Microsoft.DataFactory/factories": "Data Factory.svg",
    "Microsoft.RecoveryServices/vaults": "Recovery Services Vault.svg",
    "Microsoft.AnalysisServices/servers": "Analysis Services.svg",
    "Microsoft.Dns/zones": "DNS Zones.svg",
    "Microsoft.Cdn/profiles": "CDN.svg",
    "Microsoft.FrontDoor/frontDoors": "Front Door.svg",
    
    "Microsoft.Batch/batchAccounts": "Batch Accounts.svg",
    
    "Microsoft.Synapse/workspaces": "Synapse Analytics.svg",
    "Microsoft.Purview/accounts": "Purview.svg",
    "Microsoft.PowerBI/workspaces": "Power BI.svg",
    "Microsoft.EventGrid/topics": "Event Grid.svg",
    "Microsoft.EventGrid/domains": "Event Grid.svg",
    "Microsoft.EventGrid/eventSubscriptions": "Event Grid.svg",
    "Microsoft.HDInsight/clusters": "HDInsight.svg",
    "Microsoft.DataLakeStore/accounts": "Data Lake Store.svg",
    "Microsoft.DataLakeAnalytics/accounts": "Data Lake Analytics.svg",
    "Microsoft.ManagedIdentity/userAssignedIdentities": "Managed Identity.svg",
    "Microsoft.ManagedIdentity/identities": "Managed Identity.svg",
    "Microsoft.Authorization/roleAssignments": "Role Assignment.svg",
    "Microsoft.Authorization/policyAssignments": "Policy Assignment.svg",
    "Microsoft.Authorization/policyDefinitions": "Policy Definition.svg",
    "Microsoft.Authorization/policySetDefinitions": "Policy Set Definition.svg",
    "Microsoft.Network/privateEndpoints": "Private Endpoint.svg",
    "Microsoft.Network/privateLinkServices": "Private Link Service.svg",
    "Microsoft.Network/dnsResolvers": "DNS Resolver.svg",
    "Microsoft.Network/expressRouteCircuits": "ExpressRoute.svg",
    "Microsoft.Network/virtualNetworkGateways": "VPN Gateway.svg",
    "Microsoft.Network/applicationSecurityGroups": "Application Security Group.svg",
    "Microsoft.Network/routeTables": "Route Table.svg",
    "Microsoft.Network/trafficManagerProfiles": "Traffic Manager.svg",
    "Microsoft.Network/firewallPolicies": "Firewall Policy.svg",
    "Microsoft.Network/azureFirewalls": "Azure Firewall.svg",
    "Microsoft.Network/bastionHosts": "Bastion.svg",
    "Microsoft.Network/dnsForwardingRulesets": "DNS Forwarding Ruleset.svg",
    "Microsoft.Network/virtualRouters": "Virtual Router.svg",
    "Microsoft.Network/virtualHubs": "Virtual Hub.svg",
    "Microsoft.Network/virtualWANs": "Virtual WAN.svg",
    "Microsoft.Network/vpnGateways": "VPN Gateway.svg",
    "Microsoft.Network/vpnSites": "VPN Site.svg",
    "Microsoft.Network/vpnConnections": "VPN Connection.svg",
    "Microsoft.Network/expressRouteGateways": "ExpressRoute Gateway.svg",
    "Microsoft.Network/expressRoutePorts": "ExpressRoute Port.svg",
    "Microsoft.Network/expressRouteCrossConnections": "ExpressRoute Cross Connection.svg",
    "Microsoft.Network/expressRouteLinks": "ExpressRoute Link.svg",
    "Microsoft.Network/expressRouteConnections": "ExpressRoute Connection.svg"
  }

  const icon = typeToIconMap[type] || fallbackIcon;
  return "/azure-icons/me/" + icon;
  
}
const FlowCustomNode = memo(({ data }: { data: any }) => {
  return (
    <div
      style={{
      backgroundColor: '#f3f4f6', // Light gray background for a cleaner look
      padding: '16px', // Slightly increased padding for better spacing
      borderRadius: '12px', // More rounded corners for a modern feel
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)', // Slightly stronger shadow for depth
      border: '1px solid #e5e7eb', // Softer border color
      minWidth: '180px', // Increased width for better readability
      fontFamily: 'Arial, sans-serif', // Clean font
      }}
    >
      {/* Drag handle */}
      <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px', // Increased gap for better spacing
        cursor: 'grab',
      }}
      >
      <img
        src={getAzureIconForType(data.type)}
        alt={data.label}
        style={{ width: 64, height: 64 }} // Larger icon for better visibility
      />
      <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#374151' }}>
        {data.label}
      </span>
      </div>

      <Handle
      type="target"
      position={Position.Top}
      style={{ background: '#10b981' }} // Green color for target handle
      />
      <Handle
      type="source"
      position={Position.Bottom}
      style={{ background: '#3b82f6' }} // Blue color for source handle
      />
    </div>
  );
});
export default FlowCustomNode;
