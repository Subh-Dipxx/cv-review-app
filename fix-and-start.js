// fix-and-start.js - Fix the package-lock.json conflict and start Next.js
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

console.log('Fixing package-lock conflicts and starting Next.js...');

// 1. Backup the current package-lock.json
if (fs.existsSync('package-lock.json')) {
  console.log('Backing up package-lock.json...');
  fs.renameSync('package-lock.json', 'package-lock.json.backup');
  console.log(' Backed up package-lock.json to package-lock.json.backup');
}

// 2. Remove node_modules to ensure a clean installation
console.log('Removing node_modules for a fresh install...');
try {
  if (fs.existsSync('node_modules')) {
    // On Windows, we need to use a command to remove node_modules
    execSync('rmdir /s /q node_modules', { stdio: 'inherit' });
  }
  console.log(' Removed node_modules');
} catch (error) {
  console.log('Warning: Failed to remove node_modules:', error.message);
}

// 3. Run npm install
console.log('Installing dependencies...');
try {
  execSync('npm install --no-audit --no-fund', { stdio: 'inherit' });
  console.log(' Dependencies installed successfully');
} catch (error) {
  console.error(' Failed to install dependencies:', error.message);
  process.exit(1);
}

// 4. Check if the installation was successful
if (!fs.existsSync('node_modules/next') || !fs.existsSync('node_modules/react')) {
  console.error(' Critical dependencies are missing after installation');
  process.exit(1);
}

// 5. Start the application
console.log('Starting Next.js application...');
try {
  console.log('\nRunning npm run dev\n');
  execSync('npm run dev', { stdio: 'inherit' });
} catch (error) {
  console.error(' Failed to start Next.js application:', error.message);
}
