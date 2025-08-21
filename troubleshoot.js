// troubleshoot.js - Comprehensive Next.js fix script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('Running comprehensive Next.js troubleshooting...');
console.log('==============================================');

// 1. Check for conflicting lockfile in user directory
console.log('\n--- STEP 1: Checking for conflicting lockfiles ---');
const userDir = process.env.USERPROFILE || process.env.HOME;
const userPackageLock = path.join(userDir, 'package-lock.json');

if (fs.existsSync(userPackageLock)) {
  console.log(`Conflicting package-lock.json found at ${userPackageLock}`);
  console.log('This file might interfere with your project dependencies.');
  console.log('Recommendation: Rename or remove this file, then try again.');
  console.log('The fix script will continue but may not work if this conflict exists.');
} else {
  console.log('No conflicting lockfile found in user directory.');
}

// 2. Backup current package.json
console.log('\n--- STEP 2: Backing up config files ---');
if (fs.existsSync('package.json')) {
  fs.copyFileSync('package.json', 'package.json.backup');
  console.log(' Backed up package.json');
}

if (fs.existsSync('next.config.js')) {
  fs.copyFileSync('next.config.js', 'next.config.js.backup');
  console.log(' Backed up next.config.js');
}

// 3. Clean up project files that might be causing issues
console.log('\n--- STEP 3: Cleaning up problematic files ---');
['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'].forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(` Removed ${file}`);
  }
});

// 4. Clean up .next directory
console.log('\n--- STEP 4: Removing .next directory ---');
try {
  if (fs.existsSync('.next')) {
    // On Windows, we need to use a command to remove .next
    execSync('rmdir /s /q .next', { stdio: 'inherit' });
    console.log(' Removed .next directory');
  } else {
    console.log('No .next directory found.');
  }
} catch (error) {
  console.log(`Error removing .next directory: ${error.message}`);
}

// 5. Clean npm cache
console.log('\n--- STEP 5: Cleaning npm cache ---');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log(' Cleaned npm cache');
} catch (error) {
  console.log(`Error cleaning npm cache: ${error.message}`);
}

// 6. Reinstall dependencies
console.log('\n--- STEP 6: Reinstalling dependencies ---');
try {
  console.log('Running npm install...');
  execSync('npm install', { stdio: 'inherit' });
  console.log(' Dependencies reinstalled successfully');
} catch (error) {
  console.error(' Failed to reinstall dependencies:', error.message);
}

// 7. Create a minimal Next.js config
console.log('\n--- STEP 7: Creating minimal Next.js config ---');
const minimalNextConfig = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`;

fs.writeFileSync('next.config.js', minimalNextConfig);
console.log(' Created minimal next.config.js');

// 8. Create a powershell script for starting Next.js
console.log('\n--- STEP 8: Creating a reliable startup script ---');
const startupScript = `
# Next.js startup script
$ErrorActionPreference = "Stop"

Write-Host "Starting Next.js..."
Write-Host "Node.js Version: $(node -v)"
Write-Host "NPM Version: $(npm -v)"

# Start Next.js
npm run dev
`;

fs.writeFileSync('start-nextjs.ps1', startupScript);
console.log(' Created startup script: start-nextjs.ps1');

console.log('\n==============================================');
console.log('Troubleshooting complete!');
console.log('To start Next.js, run: powershell -File start-nextjs.ps1');
console.log('==============================================');
