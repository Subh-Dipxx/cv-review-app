# CV Review App - Reset and Restart Script
Write-Host "CV Review App - Complete Reset and Restart" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Step 1: Backup important files
Write-Host "`nStep 1: Backing up important files..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "backup_$timestamp"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

$filesToBackup = @(
    "package.json",
    "next.config.js",
    ".env.local",
    "app/page.js",
    "app/layout.js",
    "tailwind.config.js",
    "postcss.config.mjs"
)

foreach ($file in $filesToBackup) {
    if (Test-Path $file) {
        Copy-Item $file -Destination (Join-Path $backupDir $file.Replace("/", "_")) -Force
        Write-Host "  Backed up: $file" -ForegroundColor Yellow
    }
}

Write-Host "Backup complete in directory: $backupDir" -ForegroundColor Green

# Step 2: Remove problematic files and directories
Write-Host "`nStep 2: Removing problematic files and directories..." -ForegroundColor Cyan

# Remove node_modules
if (Test-Path "node_modules") {
    Write-Host "  Removing node_modules directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

# Remove .next directory
if (Test-Path ".next") {
    Write-Host "  Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
}

# Remove lock files
$lockFiles = @("package-lock.json", "yarn.lock", "pnpm-lock.yaml")
foreach ($lockFile in $lockFiles) {
    if (Test-Path $lockFile) {
        Write-Host "  Removing $lockFile..." -ForegroundColor Yellow
        Remove-Item -Force $lockFile -ErrorAction SilentlyContinue
    }
}

Write-Host "Cleanup complete" -ForegroundColor Green

# Step 3: Create minimal required files for Next.js
Write-Host "`nStep 3: Creating minimal required files for Next.js..." -ForegroundColor Cyan

# Create minimal next.config.js
$nextConfig = @"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
"@

Write-Host "  Creating minimal next.config.js..." -ForegroundColor Yellow
$nextConfig | Out-File -FilePath "next.config.js" -Encoding utf8 -Force

# Create minimal postcss.config.mjs
$postcssConfig = @"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@

Write-Host "  Creating minimal postcss.config.mjs..." -ForegroundColor Yellow
$postcssConfig | Out-File -FilePath "postcss.config.mjs" -Encoding utf8 -Force

# Create minimal tailwind.config.js
$tailwindConfig = @"
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
"@

Write-Host "  Creating minimal tailwind.config.js..." -ForegroundColor Yellow
$tailwindConfig | Out-File -FilePath "tailwind.config.js" -Encoding utf8 -Force

Write-Host "Minimal files created" -ForegroundColor Green

# Step 4: Check for conflicts in the user directory
Write-Host "`nStep 4: Checking for conflicts in the user directory..." -ForegroundColor Cyan
$userPackageLock = "$env:USERPROFILE\package-lock.json"
if (Test-Path $userPackageLock) {
    Write-Host "  WARNING: Found package-lock.json in user profile directory!" -ForegroundColor Red
    Write-Host "  This can interfere with the project's npm operations." -ForegroundColor Red
    Write-Host "  Consider renaming it: $userPackageLock" -ForegroundColor Red
    
    $renameChoice = Read-Host "  Would you like to rename this file? (y/n)"
    if ($renameChoice -eq "y") {
        Rename-Item -Path $userPackageLock -NewName "package-lock.json.bak" -Force
        Write-Host "  Renamed user directory package-lock.json to package-lock.json.bak" -ForegroundColor Green
    }
}

# Step 5: Clean npm cache
Write-Host "`nStep 5: Cleaning npm cache..." -ForegroundColor Cyan
npm cache clean --force
Write-Host "npm cache cleaned" -ForegroundColor Green

# Step 6: Reinstall dependencies
Write-Host "`nStep 6: Reinstalling dependencies..." -ForegroundColor Cyan
Write-Host "  Running npm install..." -ForegroundColor Yellow
npm install
Write-Host "Dependencies reinstalled" -ForegroundColor Green

# Step 7: Start the application
Write-Host "`nStep 7: Starting the application..." -ForegroundColor Cyan
Write-Host "  Running npm run dev..." -ForegroundColor Yellow
npm run dev

# End of script
Write-Host "`nReset and restart process completed" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
