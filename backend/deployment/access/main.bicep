targetScope = 'resourceGroup'

@description('Principal ID of the managed identity that should receive backend access.')
param principalId string

@description('Principal type for the role assignments.')
@allowed([
  'ServicePrincipal'
  'User'
  'Group'
])
param principalType string = 'ServicePrincipal'

@description('Name of the Key Vault that stores backend secrets.')
param keyVaultName string

@description('Name of the Storage Account used by the backend.')
param storageAccountName string

@description('Grant the managed identity permission to read Key Vault secrets.')
param grantKeyVaultSecretsUser bool = true

@description('Grant the managed identity blob data contributor access on the storage account.')
param grantStorageBlobDataContributor bool = true

@description('Grant the managed identity table data contributor access on the storage account.')
param grantStorageTableDataContributor bool = true

var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
var storageBlobDataContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var storageTableDataContributorRoleDefinitionId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource keyVaultSecretsUserAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (grantKeyVaultSecretsUser) {
  name: guid(keyVault.id, principalId, keyVaultSecretsUserRoleDefinitionId)
  scope: keyVault
  properties: {
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
    principalId: principalId
    principalType: principalType
  }
}

resource storageBlobDataContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (grantStorageBlobDataContributor) {
  name: guid(storageAccount.id, principalId, storageBlobDataContributorRoleDefinitionId)
  scope: storageAccount
  properties: {
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
    principalId: principalId
    principalType: principalType
  }
}

resource storageTableDataContributorAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (grantStorageTableDataContributor) {
  name: guid(storageAccount.id, principalId, storageTableDataContributorRoleDefinitionId)
  scope: storageAccount
  properties: {
    roleDefinitionId: storageTableDataContributorRoleDefinitionId
    principalId: principalId
    principalType: principalType
  }
}

output keyVaultRoleAssigned bool = grantKeyVaultSecretsUser
output storageBlobRoleAssigned bool = grantStorageBlobDataContributor
output storageTableRoleAssigned bool = grantStorageTableDataContributor
