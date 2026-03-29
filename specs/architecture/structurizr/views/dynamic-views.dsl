dynamic adminPortal "schedule-execution" "Schedule execution flow" {
    schedulerTimer -> cosmosDb "Reads due schedules"
    schedulerTimer -> queueStorage "Enqueues stage execution request"
    schedulerWorker -> queueStorage "Consumes queued stage execution request"
    schedulerWorker -> backendApi "Invokes stage start/stop execution"
    backendApi -> sharedDomain "Loads domain and storage services"
    sharedDomain -> cosmosDb "Resolves schedule and environment/stage data"
    sharedDomain -> managedAzureResources "Executes configured stage resourceActions"
    backendApi -> tableStorage "Writes audit event"
    backendApi -> cosmosDb "Writes stage execution result"
    autoLayout lr
}
