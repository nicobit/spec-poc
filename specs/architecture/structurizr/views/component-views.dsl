component backendApi "backend-api-components" "Backend API components" {
    include environmentApi
    include schedulingApi
    include authzLayer
    include environmentRepository
    include scheduleStore
    include auditStore
    include environmentModel
    include entraId
    include tableStorage
    include cosmosDb
    autoLayout lr
}

