# Ghost (gHosted) — quick start on Windows (double-click or: pwsh -File start.ps1)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js is not on PATH. Install from https://nodejs.org (LTS 18+)."
}

if (-not (Test-Path "node_modules")) {
  if (Test-Path "package-lock.json") { npm ci } else { npm install }
}

if (-not (Test-Path ".env") -and (Test-Path ".env.example")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created .env from .env.example — set DATABASE_URL for Postgres (required for sign-in/messages)."
}

Write-Host "Starting Ghost at http://localhost:5000 …"
npm run dev
