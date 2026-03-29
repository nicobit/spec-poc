deployment adminPortal "prod-deployment" "Azure-oriented production deployment view" {
    include frontend
    include backendApi
    include schedulerTimer
    include schedulerWorker
    include tableStorage
    include cosmosDb
    include queueStorage
    include keyVault
    include appInsights
    autoLayout lr
}

