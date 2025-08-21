$env:PATH += ";C:\Program Files\nodejs"

Write-Host "CV Review App - Direct Runner" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# Set working directory
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Find npm path
$npmPath = "npm"
$nodePath = "node"

if (Test-Path "C:\Program Files\nodejs\npm.cmd") {
    $npmPath = "C:\Program Files\nodejs\npm.cmd"
    $nodePath = "C:\Program Files\nodejs\node.exe"
    Write-Host "Using npm from: $npmPath" -ForegroundColor Green
} else {
    Write-Host "Using npm from PATH: $npmPath" -ForegroundColor Yellow
}

# Display system info
Write-Host "`nSystem Information:" -ForegroundColor Yellow
Write-Host "  Node.js: $(&$nodePath -v)"
Write-Host "  npm path: $npmPath"

# Start Next.js directly using node
Write-Host "`nStarting Next.js directly..." -ForegroundColor Cyan

$nextBinPath = Join-Path -Path $projectDir -ChildPath "node_modules\.bin\next"
if (Test-Path $nextBinPath) {
    Write-Host "Using Next.js binary at: $nextBinPath" -ForegroundColor Green
    # Start Next.js
    & $nodePath $nextBinPath dev
} else {
    Write-Host "Next.js binary not found at $nextBinPath" -ForegroundColor Red
    Write-Host "Attempting to start with npm..." -ForegroundColor Yellow
    # Try npm as fallback
    & $npmPath run dev
}
