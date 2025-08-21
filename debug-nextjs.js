// Debug script for Next.js startup issues
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Next.js Startup Debugging Tool');
console.log('===============================');

// Check for common files
const criticalFiles = [
  'next.config.js',
  'package.json',
  'app/layout.js',
  'app/page.js'
];

console.log('\nChecking critical files:');
criticalFiles.forEach(file => {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

// Run Next.js with debug flags
console.log('\nStarting Next.js with debug flags...');
console.log('(This will show all errors in detail)\n');

const nextProcess = spawn('node', ['./node_modules/next/dist/bin/next', 'dev'], { 
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { 
    ...process.env,
    NODE_OPTIONS: '--trace-warnings --trace-uncaught'
  } 
});

// Capture detailed output
nextProcess.stdout.on('data', (data) => {
  console.log(`[NEXT.JS]: ${data.toString().trim()}`);
});

nextProcess.stderr.on('data', (data) => {
  console.log(`[ERROR]: ${data.toString().trim()}`);
});

// Kill the process after 30 seconds if it doesn't exit
setTimeout(() => {
  console.log('\nTimeout reached. Killing Next.js process...');
  nextProcess.kill();
  console.log('\nDebug complete. If you saw any errors, they may be causing your startup issue.');
}, 15000);

console.log('Waiting for Next.js to start or show errors...');
