# Reset script - Creates a brand new Next.js project
$ErrorActionPreference = "Stop"

Write-Host "CV Review App - Complete Fresh Rebuild" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$sourceDir = "C:\Users\HP\cv-review-app"
$backupDir = "C:\Users\HP\cv-review-app-backup"
$tempDir = "C:\Users\HP\cv-review-app-temp"

# Step 1: Back up the current project
Write-Host "`nStep 1: Backing up current project..." -ForegroundColor Yellow
if (Test-Path $backupDir) {
    Remove-Item -Path $backupDir -Recurse -Force
}
Copy-Item -Path $sourceDir -Destination $backupDir -Recurse
Write-Host " Project backed up to $backupDir" -ForegroundColor Green

# Step 2: Create a fresh Next.js project
Write-Host "`nStep 2: Creating fresh Next.js project..." -ForegroundColor Yellow

# Create temp directory for the new project
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Move to temp directory and create a new Next.js project
Set-Location -Path $tempDir
Write-Host "Creating a new Next.js project with npx create-next-app..." -ForegroundColor Yellow
$createAppProcess = Start-Process -FilePath "npx" -ArgumentList "create-next-app@latest . --use-npm --no-eslint --no-tailwind --app --typescript --src-dir --import-alias '@/*' --no-git" -NoNewWindow -PassThru -Wait

if ($createAppProcess.ExitCode -ne 0) {
    Write-Host " Failed to create Next.js project. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host " Fresh Next.js project created" -ForegroundColor Green

# Step 3: Copy essential files from backup
Write-Host "`nStep 3: Copying essential files from backup..." -ForegroundColor Yellow

# Files to copy from backup to new project
$filesToCopy = @(
    "app\page.js",
    "app\layout.js",
    "app\globals.css",
    ".env.local"
)

foreach ($file in $filesToCopy) {
    $sourcePath = Join-Path -Path $backupDir -ChildPath $file
    $destPath = Join-Path -Path $tempDir -ChildPath $file
    
    if (Test-Path $sourcePath) {
        # Make sure the destination directory exists
        $destDir = Split-Path -Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  Copied: $file" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (not found): $file" -ForegroundColor Yellow
    }
}

# Step 4: Install additional dependencies from backup
Write-Host "`nStep 4: Installing additional dependencies..." -ForegroundColor Yellow

$backupPackageJsonPath = Join-Path -Path $backupDir -ChildPath "package.json"
if (Test-Path $backupPackageJsonPath) {
    $backupPackageJson = Get-Content $backupPackageJsonPath -Raw | ConvertFrom-Json
    
    # Add custom dependencies from the backup
    $dependencies = @()
    foreach ($dep in $backupPackageJson.dependencies.PSObject.Properties) {
        if ($dep.Name -notin @("next", "react", "react-dom")) {
            $dependencies += "$($dep.Name)@$($dep.Value)"
        }
    }
    
    if ($dependencies.Count -gt 0) {
        $dependenciesStr = $dependencies -join " "
        Write-Host "Installing dependencies: $dependenciesStr" -ForegroundColor Yellow
        
        Set-Location -Path $tempDir
        $installProcess = Start-Process -FilePath "npm" -ArgumentList "install $dependenciesStr --save" -NoNewWindow -PassThru -Wait
        
        if ($installProcess.ExitCode -eq 0) {
            Write-Host " Dependencies installed successfully" -ForegroundColor Green
        } else {
            Write-Host " Some dependencies may have failed to install" -ForegroundColor Yellow
        }
    } else {
        Write-Host "No additional dependencies to install" -ForegroundColor Yellow
    }
} else {
    Write-Host " Backup package.json not found, skipping dependencies" -ForegroundColor Yellow
}

# Step 5: Replace old project with new one
Write-Host "`nStep 5: Replacing old project with new one..." -ForegroundColor Yellow

# Stop any running processes in the source directory
Write-Host "Stopping any running processes in $sourceDir..." -ForegroundColor Yellow
try {
    Get-Process | Where-Object { $_.Path -like "$sourceDir\*" } | Stop-Process -Force
} catch {
    Write-Host "No processes to stop" -ForegroundColor Yellow
}

# Remove the source directory content (except for the .git folder if it exists)
Write-Host "Cleaning $sourceDir..." -ForegroundColor Yellow
if (Test-Path $sourceDir) {
    Get-ChildItem -Path $sourceDir -Exclude ".git" | Remove-Item -Recurse -Force
}

# Copy all files from temp directory to source directory
Write-Host "Copying new project files to $sourceDir..." -ForegroundColor Yellow
Copy-Item -Path "$tempDir\*" -Destination $sourceDir -Recurse -Force

Write-Host "`n Project reset complete!" -ForegroundColor Green
Write-Host "You can now start the app with: cd $sourceDir; npm run dev" -ForegroundColor Cyan
