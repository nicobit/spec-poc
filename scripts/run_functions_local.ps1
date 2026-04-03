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
    $backendPath = Join-Path $PSScriptRoot "..\backend"
    $venvPython = Join-Path $backendPath ".venv\Scripts\python.exe"

    # Azure Functions Core Tools initialises 'languageWorkers:python:defaultExecutablePath'
    # internally before reading local.settings.json, so the setting in that file is skipped.
    # Pre-setting it here ensures the venv Python is used.
    if (Test-Path $venvPython) {
        [System.Environment]::SetEnvironmentVariable(
            "languageWorkers:python:defaultExecutablePath",
            (Resolve-Path $venvPython).Path,
            "Process"
        )
        Write-Host "Using Python: $((Resolve-Path $venvPython).Path)"
    } else {
        Write-Warning "backend\.venv not found — run 'pip install -r requirements.txt' inside backend\.venv first."
    }

    Push-Location -Path $backendPath
    func start
    Pop-Location
} else {
    Write-Host "Azure Functions Core Tools (func) not found. Install it from https://learn.microsoft.com/azure/azure-functions/functions-run-local#v4"
}
