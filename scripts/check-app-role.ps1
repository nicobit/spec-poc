<#
.SYNOPSIS
  Check app role definition and assignment for an Azure AD App Registration / Enterprise Application.

.DESCRIPTION
  Uses Azure CLI and Microsoft Graph (via az rest) to:
    - read app roles defined on the App Registration
    - find the service principal (Enterprise App)
    - list app role assignments on the service principal
    - verify a specific user is assigned a given app role

.NOTES
  Requires Azure CLI signed in (az login) and sufficient permissions to read app registrations, service principals and users.

.EXAMPLE
  .\scripts\check-app-role.ps1 -UserUPN "user@contoso.com" -RoleValue "EnvironmentAdmin" -AppClientId "c7e765f3-..."

#>

param(
  [Parameter(Mandatory=$false)]
  [string]$AppClientId,

  [Parameter(Mandatory=$true)]
  [string]$UserUPN,

  [Parameter(Mandatory=$true)]
  [string]$RoleValue,

  [Parameter(Mandatory=$false)]
  [string]$TenantId
)

function Read-EnvLocalValue {
  param([string]$Key, [string]$Path)
  if (-Not (Test-Path $Path)) { return $null }
  $lines = Get-Content $Path -ErrorAction SilentlyContinue
  foreach ($l in $lines) {
    if ($l -match "^$Key=(.+)$") { return $Matches[1].Trim() }
  }
  return $null
}

try {
  if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI 'az' not found. Install and run 'az login' before using this script."; exit 2
  }

  if (-not $AppClientId) {
    $envPath = Join-Path -Path (Resolve-Path ..\frontend).Path -ChildPath ".env.local" -ErrorAction SilentlyContinue
    if (-not $envPath) { $envPath = "frontend\.env.local" }
    $maybe = Read-EnvLocalValue -Key 'VITE_API_CLIENT_ID' -Path $envPath
    if (-not $maybe) { $maybe = Read-EnvLocalValue -Key 'VITE_CLIENT_ID' -Path $envPath }
    if ($maybe) { $AppClientId = $maybe }
  }

  if (-not $AppClientId) { Write-Error "App client id not provided and not found in frontend/.env.local. Provide -AppClientId."; exit 3 }

  if ($TenantId) { az account set --subscription $TenantId | Out-Null }

  Write-Host "Using AppClientId: $AppClientId" -ForegroundColor Cyan

  # Read appRoles from the App Registration
  Write-Host "Reading app registration roles..." -ForegroundColor DarkCyan
  $appRolesJson = az ad app show --id $AppClientId --query appRoles -o json 2>$null
  if (-not $appRolesJson) { Write-Warning "No app registration found with client id $AppClientId"; exit 4 }
  $appRoles = $appRolesJson | ConvertFrom-Json
  if ($appRoles.Count -eq 0) { Write-Host "No appRoles defined on this App Registration." -ForegroundColor Yellow }
  else {
    Write-Host "Defined appRoles:" -ForegroundColor Green
    $appRoles | ForEach-Object { Write-Host " - $($_.value) (displayName: $($_.displayName)) id: $($_.id)" }
  }

  # Find the service principal for the app (Enterprise App)
  Write-Host "Resolving service principal..." -ForegroundColor DarkCyan
  $spId = az ad sp show --id $AppClientId --query objectId -o tsv 2>$null
  if (-not $spId) { Write-Error "Service principal not found for AppClientId $AppClientId. Ensure the app has a service principal (Enterprise Application)."; exit 5 }
  Write-Host "Service principal objectId: $spId" -ForegroundColor Green

  # Lookup user object id
  Write-Host "Looking up user $UserUPN" -ForegroundColor DarkCyan
  $userId = az ad user show --id $UserUPN --query objectId -o tsv 2>$null
  if (-not $userId) { Write-Error "User not found: $UserUPN"; exit 6 }
  Write-Host "User objectId: $userId" -ForegroundColor Green

  # Get app role assignments on the service principal
  Write-Host "Fetching appRoleAssignedTo for the service principal (Enterprise App)..." -ForegroundColor DarkCyan
  $assignmentsRaw = az rest --method GET --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$spId/appRoleAssignedTo" 2>$null
  if (-not $assignmentsRaw) { Write-Warning "No app role assignments found or failed to query Graph."; $assignments = @() }
  else { $assignments = ($assignmentsRaw | ConvertFrom-Json).value }

  if ($assignments.Count -eq 0) { Write-Host "No app role assignments exist on the Enterprise App." -ForegroundColor Yellow }
  else {
    Write-Host "Existing app role assignments:" -ForegroundColor Green
    foreach ($a in $assignments) {
      $principal = $a.principalDisplayName
      $appRoleId = $a.appRoleId
      $role = ($appRoles | Where-Object { $_.id -eq $appRoleId })
      $roleValue = if ($role) { $role.value } else { $appRoleId }
      Write-Host " - principal: $principal principalId:$($a.principalId) role:$roleValue" 
    }
  }

  # Check if the user has an assignment for the requested role
  $targetRole = $appRoles | Where-Object { ($_.value -eq $RoleValue) -or ($_.displayName -eq $RoleValue) }
  if (-not $targetRole) {
    Write-Warning "Role '$RoleValue' not found in appRoles on app registration. Available roles: $(@($appRoles | ForEach-Object { $_.value }) -join ', ')"; exit 7
  }
  $targetRoleId = $targetRole.id

  $userAssignment = $assignments | Where-Object { $_.principalId -eq $userId -and $_.appRoleId -eq $targetRoleId }
  if ($userAssignment) {
    Write-Host "SUCCESS: User '$UserUPN' is assigned role '$RoleValue' on the Enterprise App." -ForegroundColor Green
    exit 0
  } else {
    Write-Warning "User '$UserUPN' is NOT assigned role '$RoleValue' on the Enterprise App.";
    # For convenience, show assignments for the user across service principal
    $userAssignments = $assignments | Where-Object { $_.principalId -eq $userId }
    if ($userAssignments.Count -gt 0) {
      Write-Host "User has other role assignments on this app:" -ForegroundColor Yellow
      foreach ($u in $userAssignments) {
        $r = ($appRoles | Where-Object { $_.id -eq $u.appRoleId })
        Write-Host " - role: $($r.value) principalDisplayName: $($u.principalDisplayName)"
      }
    }
    exit 8
  }

} catch {
  Write-Error "Unexpected error: $_"
  exit 10
}
