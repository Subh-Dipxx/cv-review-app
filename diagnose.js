const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== CV Review App Diagnostic Tool ===");

// Check Node and NPM versions
console.log("\n=== Environment ===");
try {
  const nodeVersion = process.version;
  console.log(`Node.js: ${nodeVersion}`);
  
  const npmVersion = execSync('npm -v').toString().trim();
  console.log(`NPM: ${npmVersion}`);
} catch (error) {
  console.error("Error checking Node/NPM:", error.message);
}

// Check package.json
console.log("\n=== Package.json ===");
try {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = require(packagePath);
  console.log("Dependencies:");
  Object.entries(packageJson.dependencies || {}).forEach(([name, version]) => {
    console.log(`- ${name}: ${version}`);
  });
  
  // Check for OpenAI and React/Next.js compatibility
  if (packageJson.dependencies.openai) {
    console.log(`\nOpenAI version: ${packageJson.dependencies.openai}`);
    console.log(`Next.js version: ${packageJson.dependencies.next}`);
    console.log(`React version: ${packageJson.dependencies.react}`);
  }
} catch (error) {
  console.error("Error checking package.json:", error.message);
}

// Check for essential files
console.log("\n=== Essential Files ===");
const essentialFiles = [
  '.env.local',
  'next.config.js',
  'app/lib/db.js',
  'app/lib/ai-service.js',
  'app/api/process-cv/route.js'
];

essentialFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  console.log(`${file}: ${fs.existsSync(filePath) ? '✅ Found' : '❌ Missing'}`);
});

// Check database config
console.log("\n=== Environment Variables ===");
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const dbConfigured = envContent.includes('DB_HOST') && 
                      envContent.includes('DB_USER') && 
                      envContent.includes('DB_NAME');
  const openaiConfigured = envContent.includes('OPENAI_API_KEY');
  
  console.log(`Database config: ${dbConfigured ? '✅ Found' : '❌ Missing'}`);
  console.log(`OpenAI API key: ${openaiConfigured ? '✅ Found' : '❌ Missing'}`);
} else {
  console.log("❌ .env.local file not found!");
}

// Suggest fixes
console.log("\n=== Recommended Actions ===");
console.log("1. Install compatible packages:");
console.log("   npm install next@13.4.12 react@18.2.0 react-dom@18.2.0 openai@4.11.1");
console.log("2. Check your .env.local file for correct database and OpenAI credentials");
console.log("3. Make sure MySQL server is running");
console.log("4. Try running with: npm run dev -- -p 3001 (to use a different port)");
console.log("5. Run this diagnostic tool: node diagnose.js");

console.log("\nDiagnostic complete. Use this information to troubleshoot your application.");
