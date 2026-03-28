# Helper to run Azure Functions host locally (Windows PowerShell)
# Requires: Azure Functions Core Tools (func), Python 3.10+, and Azure Storage connection string for bindings.

Write-Host "Starting Azure Functions host locally..."
Write-Host "Ensure you have set AzureWebJobsStorage (AzureWebJobsStorage) and COSMOS_CONNECTION_STRING if needed."
Write-Host "Example (PowerShell):"
Write-Host "  $env:AzureWebJobsStorage=\"<your-azure-storage-connection-string>\""
Write-Host "  $env:COSMOS_CONNECTION_STRING=\"<your-cosmos-connection-string>\""
Write-Host "  cd backend"
Write-Host "  func start"

if (Get-Command func -ErrorAction SilentlyContinue) {
    Push-Location -Path (Join-Path $PSScriptRoot "..\backend")
    func start
    Pop-Location
} else {
    Write-Host "Azure Functions Core Tools (func) not found. Install it from https://learn.microsoft.com/azure/azure-functions/functions-run-local#v4"
}
