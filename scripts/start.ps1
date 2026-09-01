<#
.SYNOPSIS
    Starts the RentalHRM development server, handling one-time environment setup.

.DESCRIPTION
    - Allows locally created PowerShell scripts to run for the current user
      (fixes "npm.ps1 cannot be loaded" errors) without touching machine-wide policy.
    - Installs npm dependencies if node_modules is missing.
    - Applies Prisma migrations if the local SQLite database doesn't exist yet.
    - Starts `npm run dev`.
#>

$ErrorActionPreference = "Stop"
Set-Location -Path (Join-Path $PSScriptRoot "..")

# Allow locally-created scripts (like npm.ps1) to run for the current user only.
$currentPolicy = Get-ExecutionPolicy -Scope CurrentUser
if ($currentPolicy -eq "Restricted" -or $currentPolicy -eq "Undefined") {
    Write-Host "Setting PowerShell execution policy to RemoteSigned for current user..." -ForegroundColor Yellow
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
}

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies (npm install)..." -ForegroundColor Cyan
    npm install
    if (-not $?) { exit 1 }
}

if (-not (Test-Path "prisma\dev.db")) {
    Write-Host "No local database found. Applying Prisma migrations..." -ForegroundColor Cyan
    npm run db:migrate
    if (-not $?) { exit 1 }

    Write-Host "Seeding demo data..." -ForegroundColor Cyan
    npm run db:seed
    if (-not $?) { exit 1 }
}

Write-Host "Starting development server (npm run dev)..." -ForegroundColor Green
npm run dev
