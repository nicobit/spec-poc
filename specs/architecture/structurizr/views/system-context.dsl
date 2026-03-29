systemContext adminPortal "system-context" "Admin Portal system context" {
    include adminPortal
    include admin
    include environmentManager
    include scheduleRecipient
    include entraId
    include tableStorage
    include cosmosDb
    include queueStorage
    include keyVault
    include appInsights
    include managedAzureResources
    autoLayout lr
}

