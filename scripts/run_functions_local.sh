#!/usr/bin/env bash
# Helper to run Azure Functions host locally (Linux/macOS)
# Requires: Azure Functions Core Tools (func), Python 3.10+, and Azure Storage connection string for bindings.

set -euo pipefail

echo "Starting Azure Functions host locally..."
echo "Ensure you have set AZUREWEBJOBS_STORAGE (AzureWebJobsStorage) and COSMOS_CONNECTION_STRING if needed."

echo "Example (bash):"
echo "  export AzureWebJobsStorage=\"<your-azure-storage-connection-string>\""
echo "  export COSMOS_CONNECTION_STRING=\"<your-cosmos-connection-string>\""
echo "  cd backend"
echo "  func start"

# Optionally run automatically if func exists
if command -v func >/dev/null 2>&1; then
  echo "Running 'func start' in backend/ ..."
  cd "$(dirname "$0")/.."/backend || exit 1
  func start
else
  echo "Azure Functions Core Tools (func) not found. Install it from https://learn.microsoft.com/azure/azure-functions/functions-run-local#v4"
fi
