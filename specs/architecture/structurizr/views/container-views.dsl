container adminPortal "container-view" "Admin Portal containers" {
    include frontend
    include backendApi
    include schedulerTimer
    include schedulerWorker
    include sharedDomain
    include entraId
    include tableStorage
    include cosmosDb
    include queueStorage
    include keyVault
    include appInsights
    include managedAzureResources
    autoLayout lr
}

