targetScope = 'resourceGroup'

@description('Azure region for the App Service deployment.')
param location string = resourceGroup().location

@description('Name of the App Service plan.')
param appServicePlanName string

@description('Name of the backend Web App.')
param webAppName string

@description('SKU name for the App Service plan.')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v3'
  'P2v3'
  'P3v3'
])
param appServicePlanSku string = 'B1'

@description('Linux FX version for the backend container.')
param linuxFxVersion string

@description('Container registry server URL, for example https://ghcr.io or https://<registry>.azurecr.io.')
param containerRegistryUrl string

@secure()
@description('Container registry username.')
param containerRegistryUsername string

@secure()
@description('Container registry password or token.')
param containerRegistryPassword string

@description('Always On is recommended outside the Basic tier where supported.')
param alwaysOn bool = true

@description('Optional additional application settings.')
param appSettings object = {}

var baseAppSettings = {
  WEBSITES_PORT: '8000'
  SCM_DO_BUILD_DURING_DEPLOYMENT: 'false'
  DOCKER_REGISTRY_SERVER_URL: containerRegistryUrl
  DOCKER_REGISTRY_SERVER_USERNAME: containerRegistryUsername
  DOCKER_REGISTRY_SERVER_PASSWORD: containerRegistryPassword
}

resource serverFarm 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: appServicePlanSku
    tier: startsWith(appServicePlanSku, 'P') ? 'PremiumV3' : (startsWith(appServicePlanSku, 'S') ? 'Standard' : 'Basic')
    size: appServicePlanSku
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: serverFarm.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: linuxFxVersion
      alwaysOn: alwaysOn
      appSettings: [
        for settingName in union(baseAppSettings, appSettings): {
          name: settingName
          value: string(union(baseAppSettings, appSettings)[settingName])
        }
      ]
    }
  }
}

output webAppName string = webApp.name
output defaultHostName string = webApp.properties.defaultHostName
output principalId string = webApp.identity.principalId
