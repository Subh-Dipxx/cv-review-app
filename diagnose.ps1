# Script to diagnose Next.js startup issues
$projectDir = "C:\Users\HP\cv-review-app"
Write-Host "Diagnosing Next.js setup in directory: $projectDir"
Write-Host "-----------------------------------------------"

# Check for .env.local file
if (Test-Path "$projectDir\.env.local") {
    Write-Host " .env.local file found"
} else {
    Write-Host " .env.local file not found"
}

# Check Node.js version
$nodeVersion = node -v
Write-Host "Node.js version: $nodeVersion"

# Check Next.js config
if (Test-Path "$projectDir\next.config.js") {
    Write-Host " next.config.js found, contents:"
    Get-Content "$projectDir\next.config.js"
} else {
    Write-Host " next.config.js not found"
}

# Check dependencies
Write-Host "Running npm list to check dependencies..."
Set-Location -Path $projectDir
npm list next react react-dom --depth=0

# Check if we have the required files
Write-Host "`nChecking critical files:"
$criticalFiles = @(
    "app\page.js",
    "app\layout.js",
    "app\globals.css",
    "postcss.config.mjs",
    "tailwind.config.js"
)

foreach ($file in $criticalFiles) {
    $fullPath = Join-Path -Path $projectDir -ChildPath $file
    if (Test-Path $fullPath) {
        Write-Host " $file exists"
    } else {
        Write-Host " $file missing"
    }
}

# Try running with debug flag
Write-Host "`nAttempting to run Next.js with debug flags..."
Set-Location -Path $projectDir
npm run dev:debug
