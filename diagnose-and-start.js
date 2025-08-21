// Launch with diagnostics
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('CV Review App - Diagnostic Launcher');
console.log('===================================');

// Function to log with timestamp
function log(message) {
  const now = new Date();
  const timestamp = `${now.toISOString().split('T')[1].slice(0, -1)}`;
  console.log(`[${timestamp}] ${message}`);
}

// Check system
log('System information:');
log(`OS: ${os.platform()} ${os.release()}`);
log(`Node.js: ${process.version}`);
log(`Free memory: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB / ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`);

// Check directory structure
log('\nChecking directory structure:');
const directories = ['app', 'public', 'node_modules', 'node_modules/next', 'node_modules/react'];
directories.forEach(dir => {
  try {
    const exists = fs.existsSync(dir);
    log(`${dir}: ${exists ? 'EXISTS' : 'MISSING'}`);
  } catch (err) {
    log(`${dir}: ERROR - ${err.message}`);
  }
});

// Check critical files
log('\nChecking critical files:');
const files = [
  'next.config.js',
  'package.json',
  'postcss.config.mjs',
  'tailwind.config.js',
  'app/page.js',
  'app/layout.js'
];

files.forEach(file => {
  try {
    const exists = fs.existsSync(file);
    log(`${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
    
    if (exists && file === 'package.json') {
      const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
      log(`  - Next.js version: ${packageJson.dependencies?.next || 'not specified'}`);
      log(`  - React version: ${packageJson.dependencies?.react || 'not specified'}`);
    }
  } catch (err) {
    log(`${file}: ERROR - ${err.message}`);
  }
});

// Start Next.js with detailed output
log('\nStarting Next.js with diagnostics...');

const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

nextProcess.stdout.on('data', (data) => {
  const message = data.toString().trim();
  if (message) {
    message.split('\n').forEach(line => log(`STDOUT: ${line}`));
  }
});

nextProcess.stderr.on('data', (data) => {
  const message = data.toString().trim();
  if (message) {
    message.split('\n').forEach(line => log(`STDERR: ${line}`));
  }
});

nextProcess.on('error', (error) => {
  log(`ERROR: Failed to start Next.js - ${error.message}`);
});

nextProcess.on('exit', (code, signal) => {
  if (code === 0) {
    log(`Next.js process exited normally`);
  } else {
    log(`Next.js process exited with code ${code} and signal ${signal}`);
  }
});

log('Next.js process started');
log('Press Ctrl+C to stop the server');
