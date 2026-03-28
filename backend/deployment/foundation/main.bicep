targetScope = 'resourceGroup'

@description('Azure region for the shared backend foundation resources.')
param location string = resourceGroup().location

@description('Storage account name for backend assets and future shared storage usage.')
param storageAccountName string

@description('Key Vault name for backend secrets.')
param keyVaultName string

@description('Log Analytics workspace name.')
param logAnalyticsWorkspaceName string

@description('Application Insights component name.')
param applicationInsightsName string

@description('Enable RBAC authorization on the Key Vault.')
param enableRbacAuthorization bool = true

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
  }
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: applicationInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: enableRbacAuthorization
    enabledForDeployment: false
    enabledForTemplateDeployment: false
    enabledForDiskEncryption: false
    softDeleteRetentionInDays: 90
    publicNetworkAccess: 'Enabled'
  }
}

output storageAccountName string = storageAccount.name
output storageAccountBlobEndpoint string = storageAccount.properties.primaryEndpoints.blob
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
output applicationInsightsName string = appInsights.name
output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output logAnalyticsWorkspaceName string = workspace.name
