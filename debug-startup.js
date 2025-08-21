// debug-startup.js - Start Next.js with verbose debugging
const { spawn } = require('child_process');
const fs = require('fs');

console.log('Starting Next.js in debug mode...');

// Set environment variables for debugging
process.env.DEBUG = '*';
process.env.NODE_OPTIONS = '--inspect';

// Create a debug log file
const logStream = fs.createWriteStream('nextjs-debug.log', { flags: 'a' });

console.log('Debug logs will be written to nextjs-debug.log');

// Start Next.js with debugging
const nextProcess = spawn('npm', ['run', 'dev'], {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: { ...process.env, NODE_OPTIONS: '--inspect', DEBUG: '*' }
});

// Pipe outputs to console and log file
nextProcess.stdout.pipe(process.stdout);
nextProcess.stderr.pipe(process.stderr);
nextProcess.stdout.pipe(logStream);
nextProcess.stderr.pipe(logStream);

nextProcess.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  logStream.write(`ERROR: ${error.toString()}\n`);
});

nextProcess.on('exit', (code, signal) => {
  console.log(`Next.js process exited with code ${code} and signal ${signal}`);
  logStream.write(`EXITED: Code ${code}, Signal ${signal}\n`);
  logStream.end();
});

// Log when started
console.log('Next.js process started with PID', nextProcess.pid);
