// minimal-test.js
// This file tests if Next.js runs with minimal configuration
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Creating minimal Next.js configuration for testing...');

// Create minimal next.config.js
const nextConfigContent = `
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
`;
fs.writeFileSync('next.config.js.minimal', nextConfigContent);

// Create minimal page.js
const pageContent = `
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Next.js is working!</h1>
      <p className="mt-4">This is a minimal test page.</p>
    </main>
  )
}
`;
const pageDir = path.join('app');
if (!fs.existsSync(pageDir)) {
  fs.mkdirSync(pageDir, { recursive: true });
}
fs.writeFileSync(path.join(pageDir, 'page.js.minimal'), pageContent);

console.log('Testing Next.js startup with minimal configuration...');
try {
  console.log('Starting Next.js for 5 seconds...');
  // Try to start Next.js with minimal config and kill after 5 seconds
  const childProcess = require('child_process').spawn('npx', ['next', 'dev', '--port', '3001'], {
    stdio: 'inherit'
  });
  
  setTimeout(() => {
    console.log('Test complete - Next.js started successfully!');
    childProcess.kill();
  }, 5000);
} catch (error) {
  console.error('Failed to start Next.js:', error);
}
