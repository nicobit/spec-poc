dynamic adminPortal "schedule-execution" "Schedule execution flow" {
    schedulerTimer -> cosmosDb "Reads due schedules"
    schedulerTimer -> queueStorage "Enqueues due schedule work"
    schedulerWorker -> queueStorage "Consumes queued schedule work"
    schedulerWorker -> backendApi "Invokes stage lifecycle action"
    backendApi -> sharedDomain "Loads domain and storage services"
    backendApi -> managedAzureResources "Triggers start, stop, or message action"
    backendApi -> tableStorage "Writes audit event"
    autoLayout lr
}

