# CV Review App - Start Script
# This script ensures proper execution of the Next.js application

$ErrorActionPreference = "Stop"

# Script version
$scriptVersion = "1.0.0"

# Display header
Write-Host "CV Review App - Start Script v$scriptVersion" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Set the project directory
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Environment check
Write-Host "`nEnvironment Check:" -ForegroundColor Yellow
$nodeVersion = node -v
Write-Host "  Node.js: $nodeVersion"
$npmVersion = npm -v
Write-Host "  npm: $npmVersion"

# Check for required files
Write-Host "`nChecking required files:" -ForegroundColor Yellow
$requiredFiles = @(
    "package.json",
    "next.config.js",
    "app\page.js",
    "app\layout.js"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   $file" -ForegroundColor Green
    } else {
        Write-Host "   $file" -ForegroundColor Red
        $missingFiles += $file
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host "`nWARNING: Some required files are missing." -ForegroundColor Red
    Write-Host "Would you like to run the rebuild script? (y/n)" -ForegroundColor Yellow
    $answer = Read-Host
    if ($answer -eq "y") {
        & "$projectDir\rebuild.ps1"
    } else {
        Write-Host "Continuing without rebuilding..." -ForegroundColor Yellow
    }
}

# Check for .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "`n.env.local file not found. Creating a default one..." -ForegroundColor Yellow
    @"
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=cv_review
"@ | Out-File -FilePath ".env.local" -Encoding utf8
    Write-Host "Created .env.local with default values." -ForegroundColor Green
    Write-Host "Please update the database credentials if needed." -ForegroundColor Yellow
}

# Check for node_modules and essential dependencies
$nextBin = Join-Path -Path $projectDir -ChildPath "node_modules\.bin\next.cmd"
$requiredDependencies = @(
    "next",
    "react",
    "react-dom",
    "react-dropzone",
    "react-hot-toast",
    "pdf-parse",
    "mysql2"
)

$missingDependencies = @()

# Check if node_modules exists at all
if (-not (Test-Path "node_modules")) {
    Write-Host "`nnode_modules directory not found. Need to install all dependencies." -ForegroundColor Yellow
    $installAll = $true
} else {
    # Check each required dependency
    Write-Host "`nChecking required dependencies:" -ForegroundColor Yellow
    $installAll = $false
    
    foreach ($dep in $requiredDependencies) {
        $depPath = Join-Path -Path $projectDir -ChildPath "node_modules\$dep"
        if (Test-Path $depPath) {
            Write-Host "  ✓ $dep" -ForegroundColor Green
        } else {
            Write-Host "  ✗ $dep" -ForegroundColor Red
            $missingDependencies += $dep
        }
    }
    
    if ($missingDependencies.Count -gt 0) {
        Write-Host "`nSome dependencies are missing." -ForegroundColor Yellow
    }
}

# Install dependencies if needed
if ($installAll -or $missingDependencies.Count -gt 0) {
    if ($installAll) {
        Write-Host "`nInstalling all dependencies..." -ForegroundColor Yellow
        npm install --no-audit --no-fund
    } else {
        Write-Host "`nInstalling missing dependencies: $($missingDependencies -join ", ")..." -ForegroundColor Yellow
        npm install $($missingDependencies -join " ") --no-audit --no-fund
    }
} else {
    Write-Host "`nAll dependencies are installed." -ForegroundColor Green
}

# Start the application
Write-Host "`nStarting CV Review App..." -ForegroundColor Green
Write-Host "Access the application at: http://localhost:3000" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server`n" -ForegroundColor Yellow

npm run dev
