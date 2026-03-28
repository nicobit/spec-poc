<#
.SYNOPSIS
  List app roles defined on an App Registration and all principals assigned to each role.

.DESCRIPTION
  - Reads `appRoles` from the App Registration (client or API)
  - Resolves the service principal (Enterprise App)
  - Lists `appRoleAssignedTo` entries and groups them by role
  - For group assignments, optionally enumerates group members

.NOTES
  - Requires Azure CLI (`az`) signed in and permissions to read apps/service principals/users/groups.
  - If your tenant blocks group operations, group member enumeration may fail.

.PARAMETER AppClientId
  The app (client) id of the App Registration. If omitted the script will try to read `VITE_API_CLIENT_ID` or `VITE_CLIENT_ID` from `frontend/.env.local`.

.PARAMETER ExpandGroupMembers
  If present, the script will list members for groups assigned to app roles.

.EXAMPLE
  .\scripts\list-roles-users.ps1 -AppClientId "c7e765f3-..." -ExpandGroupMembers

#>

param(
  [string]$AppClientId,
  [switch]$ExpandGroupMembers
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

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  Write-Error "Azure CLI 'az' not found. Install Azure CLI before using this script."; exit 2
}

# Ensure user is signed in; if not, prompt interactive login
try {
  $acctId = az account show --query id -o tsv 2>$null
} catch {
  $acctId = $null
}
if (-not $acctId) {
  Write-Host "Not signed in to Azure. Opening browser for 'az login'..." -ForegroundColor Yellow
  try {
    az login | Out-Null
    $acctId = az account show --query id -o tsv 2>$null
    if (-not $acctId) { Write-Error "'az login' did not complete successfully."; exit 2 }
  } catch {
    Write-Error "Failed to run 'az login'. Ensure Azure CLI is installed and available."; exit 2
  }
}

if (-not $AppClientId) {
  $envPath = Join-Path -Path (Resolve-Path ..\frontend).Path -ChildPath ".env.local" -ErrorAction SilentlyContinue
  if (-not $envPath) { $envPath = "frontend\.env.local" }
  $maybe = Read-EnvLocalValue -Key 'VITE_API_CLIENT_ID' -Path $envPath
  if (-not $maybe) { $maybe = Read-EnvLocalValue -Key 'VITE_CLIENT_ID' -Path $envPath }
  if ($maybe) { $AppClientId = $maybe }
}

if (-not $AppClientId) { Write-Error "App client id not provided and not found in frontend/.env.local. Provide -AppClientId."; exit 3 }

Write-Host "AppClientId: $AppClientId`n" -ForegroundColor Cyan

# Read appRoles
$appRolesJson = az ad app show --id $AppClientId --query appRoles -o json 2>$null
if (-not $appRolesJson) { Write-Error "No app registration found with client id $AppClientId"; exit 4 }
$appRoles = $appRolesJson | ConvertFrom-Json

if ($null -eq $appRoles -or $appRoles.Count -eq 0) {
  Write-Host "No appRoles defined on the App Registration." -ForegroundColor Yellow
} else {
  Write-Host "Defined appRoles:" -ForegroundColor Green
  $appRoles | ForEach-Object { Write-Host " - $($_.value) (displayName: $($_.displayName)) id: $($_.id)" }
}

# Resolve service principal (Enterprise App)
$spId = az ad sp show --id $AppClientId --query objectId -o tsv 2>$null
if (-not $spId) { Write-Error "Service principal not found for AppClientId $AppClientId. Ensure the app has an Enterprise Application."; exit 5 }
Write-Host "Service principal objectId: $spId`n" -ForegroundColor Green

# Fetch app role assignments
Write-Host "Querying appRoleAssignedTo..." -ForegroundColor DarkCyan
$assignmentsRaw = az rest --method GET --uri "https://graph.microsoft.com/v1.0/servicePrincipals/$spId/appRoleAssignedTo" 2>$null
if (-not $assignmentsRaw) { Write-Warning "No app role assignments found or Graph query failed."; $assignments = @() }
else { $assignments = ($assignmentsRaw | ConvertFrom-Json).value }

if ($assignments.Count -eq 0) { Write-Host "No app role assignments on this Enterprise App." -ForegroundColor Yellow }

# Group assignments by role
$byRole = @{}
foreach ($a in $assignments) {
  $roleId = $a.appRoleId
  if (-not $byRole.ContainsKey($roleId)) { $byRole[$roleId] = @() }
  $byRole[$roleId] += $a
}

Write-Host "`nAssignments by role:`n" -ForegroundColor Cyan
foreach ($roleId in $byRole.Keys) {
  $role = $appRoles | Where-Object { $_.id -eq $roleId }
  $roleLabel = if ($role) { $role.value } else { $roleId }
  Write-Host "Role: $roleLabel`n" -ForegroundColor Green

  foreach ($entry in $byRole[$roleId]) {
    $principalId = $entry.principalId
    $displayName = $entry.principalDisplayName
    # Determine principal type: user, group, or servicePrincipal
    $isUser = $false; $isGroup = $false; $isSp = $false
    try { $u = az ad user show --id $principalId --query userPrincipalName -o tsv 2>$null; if ($u) { $isUser = $true; $principalRef = $u } }
    catch {}
    if (-not $isUser) {
      try { $g = az ad group show --group $principalId --query displayName -o tsv 2>$null; if ($g) { $isGroup = $true; $principalRef = $g } }
      catch {}
    }
    if (-not $isUser -and -not $isGroup) {
      # fallback: service principal or unknown
      try { $s = az ad sp show --id $principalId --query appId -o tsv 2>$null; if ($s) { $isSp = $true; $principalRef = $s } }
      catch {}
    }

    if ($isUser) { Write-Host " - User: $displayName ($principalRef) id:$principalId" }
    elseif ($isGroup) { Write-Host " - Group: $displayName ($principalRef) id:$principalId" }
    elseif ($isSp) { Write-Host " - ServicePrincipal: $displayName appId:$principalRef id:$principalId" }
    else { Write-Host " - Principal: $displayName id:$principalId (type unknown)" }

    if ($ExpandGroupMembers -and $isGroup) {
      Write-Host ("   Members of group " + $principalRef + ":") -ForegroundColor DarkYellow
      try {
        $membersRaw = az ad group member list --group $principalId --query "[].{id:objectId,display:displayName,userPrincipalName:userPrincipalName}" -o json 2>$null
        $members = $membersRaw | ConvertFrom-Json
        foreach ($m in $members) { Write-Host "     - $($m.display) $($m.userPrincipalName) id:$($m.id)" }
      } catch { Write-Host "     (failed to enumerate members - permission or tenant limitation)" }
    }
  }

  Write-Host "`n" 
}

Write-Host "Done." -ForegroundColor Cyan
