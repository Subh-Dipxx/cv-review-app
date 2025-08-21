console.log('Running pre-start health check...');

// Check environment variables
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Create a .env.local file with these variables to ensure proper functionality.');
}

// Check Node.js version
const nodeVersion = process.version;
console.log(`Node.js version: ${nodeVersion}`);
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < 16) {
  console.warn(`⚠️ Node.js ${nodeVersion} may be too old. Next.js works best with Node.js 16+`);
}

// Check for common startup blockers
try {
  // Try to load key dependencies
  require('next');
  require('react');
  require('react-dom');
  console.log('✅ Core dependencies loaded successfully');
} catch (error) {
  console.error('❌ Failed to load dependencies:', error.message);
  console.error('Try running: npm install');
  process.exit(1);
}

console.log('✅ Pre-start check completed - starting Next.js');
