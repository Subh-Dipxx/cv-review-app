# Direct Next.js launcher script
$ErrorActionPreference = "Stop"

Write-Host "CV Review App - Direct Launcher" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Set working directory
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Find npm path
$npmPath = (Get-Command npm -ErrorAction SilentlyContinue).Source
if (-not $npmPath) {
    $npmPath = "C:\Program Files\nodejs\npm.cmd"
}

# Display system info
Write-Host "`nSystem Information:" -ForegroundColor Yellow
Write-Host "  Node.js: $(node -v)"
Write-Host "  npm path: $npmPath"

# Check for critical dependencies
Write-Host "`nChecking dependencies:" -ForegroundColor Yellow
$nextBin = Join-Path -Path $projectDir -ChildPath "node_modules\.bin\next.cmd"
if (Test-Path $nextBin) {
    Write-Host "  Next.js binary found at $nextBin" -ForegroundColor Green
    $useNextBin = $true
} else {
    Write-Host "  Next.js binary not found - will use npm" -ForegroundColor Yellow
    $useNextBin = $false
}

# Start Next.js
Write-Host "`nStarting Next.js..." -ForegroundColor Green
Write-Host "You can access the application at: http://localhost:3000" -ForegroundColor Yellow

if ($useNextBin) {
    # Start using next binary directly
    & "$nextBin" dev
} else {
    # Start using npm
    & "$npmPath" run dev
}
