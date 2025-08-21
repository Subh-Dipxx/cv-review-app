// system-check.js - Check the environment for issues that might prevent Next.js from running
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('Running system check for Next.js environment issues...');
console.log('==============================================');

// System information
console.log('\n--- SYSTEM INFORMATION ---');
console.log(`Operating System: ${os.platform()} ${os.release()}`);
console.log(`Architecture: ${os.arch()}`);
console.log(`Total Memory: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);
console.log(`Free Memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`);

// Node.js information
console.log('\n--- NODE.JS INFORMATION ---');
console.log(`Node.js version: ${process.version}`);

try {
  const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
  console.log(`npm version: ${npmVersion}`);
} catch (e) {
  console.log('npm version: ERROR - could not determine version');
  console.error(e.message);
}

// Project structure check
console.log('\n--- PROJECT STRUCTURE ---');
const criticalFiles = [
  'package.json',
  'next.config.js',
  'app/page.js',
  'app/layout.js',
  'tailwind.config.js',
  'postcss.config.mjs',
  'node_modules/next/package.json'
];

criticalFiles.forEach(file => {
  try {
    const exists = fs.existsSync(file);
    console.log(`${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
    
    if (exists && file === 'package.json' || file === 'next.config.js' || file === 'node_modules/next/package.json') {
      try {
        const content = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (file === 'package.json') {
          console.log(`  - Next.js version: ${content.dependencies?.next || 'not found'}`);
          console.log(`  - React version: ${content.dependencies?.react || 'not found'}`);
        } else if (file === 'node_modules/next/package.json') {
          console.log(`  - Installed Next.js: ${content.version || 'unknown'}`);
        }
      } catch (err) {
        console.log(`  - Error reading file: ${err.message}`);
      }
    }
  } catch (err) {
    console.log(`${file}: ERROR - ${err.message}`);
  }
});

// Environment variables check
console.log('\n--- ENVIRONMENT VARIABLES ---');
const nextEnvVars = Object.keys(process.env).filter(key => key.startsWith('NEXT_') || key.startsWith('NODE_'));
console.log('Next.js related environment variables:');
nextEnvVars.forEach(key => console.log(`${key}: ${process.env[key]}`));

// Port check
console.log('\n--- PORT CHECK ---');
try {
  const checkPort = (port) => {
    try {
      const netstat = execSync('netstat -ano | findstr :' + port, { encoding: 'utf8' });
      console.log(`Port ${port} status: IN USE`);
      console.log(netstat);
      return false;
    } catch (e) {
      console.log(`Port ${port} status: AVAILABLE`);
      return true;
    }
  };
  
  checkPort(3000); // Default Next.js port
} catch (e) {
  console.log('Port check error:', e.message);
}

// Node modules check
console.log('\n--- NODE_MODULES CHECK ---');
const requiredPackages = ['next', 'react', 'react-dom'];
requiredPackages.forEach(pkg => {
  try {
    const pkgPath = path.join('node_modules', pkg);
    const exists = fs.existsSync(pkgPath);
    console.log(`${pkg}: ${exists ? 'INSTALLED' : 'MISSING'}`);
  } catch (err) {
    console.log(`${pkg}: ERROR - ${err.message}`);
  }
});

// Check for conflicting Next.js installations
console.log('\n--- DEPENDENCY CONFLICT CHECK ---');
try {
  console.log('Checking for global Next.js installation...');
  try {
    const globalNextVersion = execSync('npm list -g next --depth=0', { encoding: 'utf8' }).trim();
    console.log(globalNextVersion);
  } catch (e) {
    console.log('No global Next.js installation found');
  }
  
  console.log('\nChecking for multiple package-lock.json files...');
  const userProfilePath = os.homedir();
  const currentPath = process.cwd();
  
  // Check if there are package-lock.json files both in user home and project dir
  const userProfilePackageLock = fs.existsSync(path.join(userProfilePath, 'package-lock.json'));
  const projectPackageLock = fs.existsSync(path.join(currentPath, 'package-lock.json'));
  
  console.log(`User profile package-lock.json: ${userProfilePackageLock ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`Project package-lock.json: ${projectPackageLock ? 'EXISTS' : 'NOT FOUND'}`);
  
  if (userProfilePackageLock && projectPackageLock) {
    console.log('WARNING: Multiple package-lock.json files found. This might cause conflicts!');
  }
} catch (e) {
  console.log('Error checking for dependency conflicts:', e.message);
}

console.log('\n==============================================');
console.log('System check complete!');
