# Simple rebuild script that uses npm directly
$ErrorActionPreference = "Stop"

Write-Host "CV Review App - Simple Rebuild" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan

# Set working directory
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Step 1: Create backup
Write-Host "`nStep 1: Creating backup of critical files..." -ForegroundColor Yellow
$backupDir = Join-Path -Path $projectDir -ChildPath "backup_$(Get-Date -Format 'yyyy-MM-dd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Files to backup
$filesToBackup = @(
    "package.json",
    ".env.local",
    "app\page.js",
    "app\layout.js",
    "app\globals.css"
)

foreach ($file in $filesToBackup) {
    $sourcePath = Join-Path -Path $projectDir -ChildPath $file
    $destPath = Join-Path -Path $backupDir -ChildPath $file
    
    if (Test-Path $sourcePath) {
        # Make sure the destination directory exists
        $destDir = Split-Path -Path $destPath -Parent
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        Write-Host "  Backed up: $file" -ForegroundColor Green
    }
}

# Step 2: Clean up problematic files
Write-Host "`nStep 2: Cleaning up problematic files..." -ForegroundColor Yellow
$filesToRemove = @(
    "package-lock.json",
    ".next"
)

foreach ($file in $filesToRemove) {
    $path = Join-Path -Path $projectDir -ChildPath $file
    if (Test-Path $path) {
        if ((Get-Item $path) -is [System.IO.DirectoryInfo]) {
            Remove-Item -Path $path -Recurse -Force
        } else {
            Remove-Item -Path $path -Force
        }
        Write-Host "  Removed: $file" -ForegroundColor Green
    }
}

# Step 3: Recreate minimal config files
Write-Host "`nStep 3: Creating minimal configuration files..." -ForegroundColor Yellow

# Minimal next.config.js
@"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
"@ | Out-File -FilePath "next.config.js" -Encoding utf8
Write-Host "  Created: next.config.js" -ForegroundColor Green

# Minimal postcss.config.mjs
@"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@ | Out-File -FilePath "postcss.config.mjs" -Encoding utf8
Write-Host "  Created: postcss.config.mjs" -ForegroundColor Green

# Minimal tailwind.config.js
@"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
}
"@ | Out-File -FilePath "tailwind.config.js" -Encoding utf8
Write-Host "  Created: tailwind.config.js" -ForegroundColor Green

# Step 4: Install dependencies
Write-Host "`nStep 4: Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Yellow

# First, try to install core dependencies
$coreInstallProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install next@13.4.19 react@18.2.0 react-dom@18.2.0 --save" -NoNewWindow -PassThru -Wait
if ($coreInstallProcess.ExitCode -ne 0) {
    Write-Host " Failed to install core dependencies. Aborting." -ForegroundColor Red
    exit 1
}
Write-Host "  Installed core dependencies" -ForegroundColor Green

# Then install additional dependencies
$additionalDeps = @(
    "mysql2@^3.6.5",
    "pdf-parse@^1.1.1",
    "react-dropzone@^14.3.8",
    "react-hot-toast@^2.4.0"
)

$additionalDepsStr = $additionalDeps -join " "
$additionalInstallProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install $additionalDepsStr --save" -NoNewWindow -PassThru -Wait
if ($additionalInstallProcess.ExitCode -ne 0) {
    Write-Host " Some additional dependencies may not have installed correctly" -ForegroundColor Yellow
} else {
    Write-Host "  Installed additional dependencies" -ForegroundColor Green
}

# Install dev dependencies
$devDeps = @(
    "tailwindcss@^3.3.3",
    "postcss@^8.4.31",
    "autoprefixer@^10.4.16"
)

$devDepsStr = $devDeps -join " "
$devInstallProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install $devDepsStr --save-dev" -NoNewWindow -PassThru -Wait
if ($devInstallProcess.ExitCode -ne 0) {
    Write-Host " Some dev dependencies may not have installed correctly" -ForegroundColor Yellow
} else {
    Write-Host "  Installed dev dependencies" -ForegroundColor Green
}

Write-Host "`n Rebuild complete! You can now run the app with:" -ForegroundColor Green
Write-Host "npm run dev" -ForegroundColor Cyan
