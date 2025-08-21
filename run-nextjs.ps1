# Script to run Next.js with proper directory context
$projectDir = "C:\Users\HP\cv-review-app"
Write-Host "Starting Next.js in directory: $projectDir"
Write-Host "-----------------------------------------------"

# Check for .env.local file
if (Test-Path "$projectDir\.env.local") {
    Write-Host " .env.local file found"
} else {
    Write-Host " .env.local file not found - using default settings"
}

# Check Node.js version
$nodeVersion = node -v
Write-Host "Node.js version: $nodeVersion"

# Start Next.js development server with explicit directory
Write-Host "Starting Next.js development server..."
Set-Location -Path $projectDir
npm run dev
