// diagnose-errors.js - Check for common Next.js startup errors and CV categorization issues
const fs = require('fs');
const path = require('path');

console.log('Diagnosing common Next.js startup errors and CV categorization issues...');
console.log('=================================================================');

// Error patterns to look for
const errorPatterns = [
  { pattern: "ERR_PACKAGE_PATH_NOT_EXPORTED", description: "Module resolution error - package exports issue" },
  { pattern: "SyntaxError: Cannot use import statement outside a module", description: "ESM/CJS module syntax error" },
  { pattern: "Error: Cannot find module", description: "Missing dependency" },
  { pattern: "Module not found", description: "Webpack module resolution error" },
  { pattern: "EADDRINUSE", description: "Port already in use" },
  { pattern: "Invalid configuration object", description: "Next.js configuration error" },
  { pattern: "Invalid hook call", description: "React hook rules violation" },
  { pattern: "webpack is not defined", description: "Webpack not properly loaded" },
  { pattern: "EPERM", description: "Permission error" },
  { pattern: "EACCES", description: "Access denied error" },
  { pattern: "NOT_FOUND", description: "File or module not found" }
];

// Check Next.js configuration
console.log('\n--- CHECKING NEXT.JS CONFIGURATION ---');
try {
  if (fs.existsSync('next.config.js')) {
    const configContent = fs.readFileSync('next.config.js', 'utf8');
    console.log('next.config.js content:');
    console.log(configContent);
    
    // Check for common configuration issues
    if (configContent.includes('experimental')) {
      console.log(' WARNING: Experimental features detected in config!');
    }
    
    if (configContent.includes('webpack')) {
      console.log(' WARNING: Custom webpack configuration detected!');
    }
  } else {
    console.log(' next.config.js not found!');
  }
} catch (err) {
  console.log('Error reading Next.js configuration:', err.message);
}

// Check package.json dependencies
console.log('\n--- CHECKING PACKAGE.JSON DEPENDENCIES ---');
try {
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const nextVersion = packageJson.dependencies?.next || 'not found';
    const reactVersion = packageJson.dependencies?.react || 'not found';
    const reactDomVersion = packageJson.dependencies?.['react-dom'] || 'not found';
    
    console.log(`Next.js version: ${nextVersion}`);
    console.log(`React version: ${reactVersion}`);
    console.log(`React DOM version: ${reactDomVersion}`);
    
    // Check for version compatibility
    if (nextVersion.startsWith('13.') && !reactVersion.startsWith('18.')) {
      console.log(' COMPATIBILITY ISSUE: Next.js 13 requires React 18!');
    }
    
    if (reactVersion !== reactDomVersion) {
      console.log(' COMPATIBILITY ISSUE: React and React DOM versions should match!');
    }
  } else {
    console.log(' package.json not found!');
  }
} catch (err) {
  console.log('Error checking package.json:', err.message);
}

// Check for .next directory issues
console.log('\n--- CHECKING .NEXT DIRECTORY ---');
try {
  if (fs.existsSync('.next')) {
    console.log('.next directory exists. It might contain stale build artifacts.');
    console.log('Consider removing it with: rm -rf .next');
  } else {
    console.log('.next directory not found (this is normal if you haven\'t built the project yet).');
  }
} catch (err) {
  console.log('Error checking .next directory:', err.message);
}

// Look for lockfile conflicts
console.log('\n--- CHECKING FOR LOCKFILE CONFLICTS ---');
const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
const foundLockFiles = [];

lockFiles.forEach(lockFile => {
  if (fs.existsSync(lockFile)) {
    foundLockFiles.push(lockFile);
  }
});

if (foundLockFiles.length > 1) {
  console.log(` LOCKFILE CONFLICT: Found multiple lockfiles: ${foundLockFiles.join(', ')}`);
  console.log('This can cause dependency resolution issues. Keep only one lockfile.');
} else if (foundLockFiles.length === 1) {
  console.log(`Found lockfile: ${foundLockFiles[0]}`);
} else {
  console.log('No lockfile found. This might cause inconsistent installations.');
}

// Check for conflicting installations in the user directory
console.log('\n--- CHECKING USER DIRECTORY FOR CONFLICTS ---');
const userDir = process.env.USERPROFILE || process.env.HOME;
const userPackageLock = path.join(userDir, 'package-lock.json');

if (fs.existsSync(userPackageLock)) {
  console.log(' CONFLICT: Found package-lock.json in user directory!');
  console.log('This can interfere with your project\'s dependencies.');
  console.log(`Consider removing: ${userPackageLock}`);
} else {
  console.log('No conflicting lockfile found in user directory.');
}

// Check node_modules 
console.log('\n--- CHECKING NODE_MODULES ---');
try {
  if (!fs.existsSync('node_modules')) {
    console.log(' node_modules directory not found! Run npm install.');
  } else if (!fs.existsSync('node_modules/next') || !fs.existsSync('node_modules/react')) {
    console.log(' Critical dependencies missing in node_modules! Run npm install.');
  } else {
    console.log(' node_modules directory exists with critical dependencies.');
  }
} catch (err) {
  console.log('Error checking node_modules:', err.message);
}

// Check for CV categorization issues
console.log('\n--- CHECKING CV CATEGORIZATION COMPONENTS ---');

// Check 1: Check AI service implementation
const aiServicePath = path.join(process.cwd(), 'app', 'lib', 'ai-service.js');
try {
  if (fs.existsSync(aiServicePath)) {
    console.log('Found AI service file at:', aiServicePath);
    const aiService = fs.readFileSync(aiServicePath, 'utf8');
    
    // Check for proper OpenAI initialization
    if (aiService.includes('OpenAI from') && aiService.includes('apiKey')) {
      console.log('✓ OpenAI client initialization found');
    } else {
      console.log('❌ Missing proper OpenAI client initialization');
    }
    
    // Check for version compatibility handling
    if (aiService.includes('chat.completions.create') && aiService.includes('createChatCompletion')) {
      console.log('✓ API version compatibility handling found');
    } else {
      console.log('❌ Missing API version compatibility handling');
    }
    
    // Check for error handling
    if (aiService.includes('getDefaultAnalysis') && aiService.includes('catch (')) {
      console.log('✓ Error handling found');
    } else {
      console.log('❌ Insufficient error handling in AI service');
    }
  } else {
    console.log('AI service file not found. CV categorization may not work.');
  }
} catch (err) {
  console.log('Error checking AI service:', err.message);
}

// Check 2: Check process-cv API route
const processCvPath = path.join(process.cwd(), 'app', 'api', 'process-cv', 'route.js');
try {
  if (fs.existsSync(processCvPath)) {
    console.log('\nFound process-cv API route at:', processCvPath);
    const processRoute = fs.readFileSync(processCvPath, 'utf8');
    
    // Check for analyzeCvWithAI import
    if (processRoute.includes('import { analyzeCvWithAI }') || processRoute.includes('import pool from')) {
      console.log('✓ Required imports found');
    } else {
      console.log('❌ Missing required imports in process-cv route');
    }
    
    // Check for proper error handling
    if (processRoute.includes('try {') && processRoute.includes('catch (') && processRoute.includes('finally {')) {
      console.log('✓ Error handling structure found');
    } else {
      console.log('❌ Insufficient error handling in process-cv route');
    }
  } else {
    console.log('process-cv API route not found. CV categorization may not work.');
  }
} catch (err) {
  console.log('Error checking process-cv route:', err.message);
}

console.log('\n=================================================================');
console.log('Error diagnosis complete!');
console.log('SOLUTION: If Next.js issues persist, try the following:');
console.log('1. Delete node_modules and package-lock.json');
console.log('2. Run npm cache clean --force');
console.log('3. Run npm install');
console.log('4. Start Next.js with npm run dev');
console.log('\nSOLUTION: If CV categorization fails, try:');
console.log('1. Check OpenAI API key in .env.local');
console.log('2. Fix AI service version compatibility');
console.log('3. Improve error handling in process-cv route');
console.log('4. Check database connection parameters');
console.log('=================================================================');
