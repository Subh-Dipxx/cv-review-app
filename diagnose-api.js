// diagnose-api.js - Script to test API endpoints and diagnose issues
const fs = require('fs');
const path = require('path');
// Use global fetch if available (Node.js 18+), otherwise try to require node-fetch
const fetch = globalThis.fetch || require('node-fetch');

async function diagnoseApis() {
  console.log('CV Review App - API Diagnostics');
  console.log('============================');

  // Setup a test PDF file if available
  const testFilePath = path.join(process.cwd(), 'test-data', 'sample-cv.pdf');
  let testFileAvailable = false;
  
  try {
    if (fs.existsSync(testFilePath)) {
      testFileAvailable = true;
      console.log('Test file found:', testFilePath);
    } else {
      console.log('No test file found at:', testFilePath);
      console.log('Continuing with endpoint checks only');
    }
  } catch (error) {
    console.error('Error checking for test file:', error.message);
  }

  // Test endpoints
  const endpoints = [
    { path: '/api/debug', method: 'GET', name: 'Debug Endpoint' },
    { path: '/api/test', method: 'GET', name: 'Test Endpoint' },
    { path: '/api/get-cvs', method: 'GET', name: 'Get CVs Endpoint' },
    { path: '/api/get-summaries', method: 'GET', name: 'Get Summaries Endpoint' }
  ];
  
  console.log('\nTesting API Endpoints:');
  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const response = await fetch(`http://localhost:3000${endpoint.path}`, { 
        method: endpoint.method 
      });
      const elapsed = Date.now() - start;
      
      console.log(`\n${endpoint.name} (${endpoint.path}):`);
      console.log(`  Status: ${response.status} ${response.statusText}`);
      console.log(`  Response time: ${elapsed}ms`);
      
      // Only try to parse JSON for successful responses
      if (response.ok) {
        try {
          const data = await response.json();
          console.log('  Response data:', JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : ''));
        } catch (jsonError) {
          console.log('  Response is not JSON:', jsonError.message);
        }
      }
    } catch (error) {
      console.error(`  Error testing ${endpoint.name}:`, error.message);
    }
  }
  
  // Check configuration
  console.log('\nChecking Environment Configuration:');
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    console.log('  .env.local file exists');
    try {
      const envContent = fs.readFileSync(envFile, 'utf8');
      
      // Check for database config
      const hasDb = envContent.includes('DATABASE_URL') || 
                   (envContent.includes('DB_HOST') && envContent.includes('DB_USER'));
      console.log('  Database configuration:', hasDb ? 'Found' : 'Not found');
      
      // Check for OpenAI API key
      const hasOpenAI = envContent.includes('OPENAI_API_KEY');
      console.log('  OpenAI API configuration:', hasOpenAI ? 'Found' : 'Not found');
      
      if (hasOpenAI) {
        // Check if OpenAI key looks valid (starts with 'sk-')
        const match = envContent.match(/OPENAI_API_KEY=["']?(sk-[^"'\r\n]+)/);
        if (match && match[1].startsWith('sk-')) {
          console.log('  OpenAI API key format appears valid');
        } else {
          console.log('  Warning: OpenAI API key format may be invalid');
        }
      }
    } catch (readError) {
      console.error('  Error reading .env.local file:', readError.message);
    }
  } else {
    console.log('  Warning: No .env.local file found');
  }
  
  // Check for required database tables
  console.log('\nAdditional checks:');
  try {
    const { createPool } = require('mysql2/promise');
    let pool;
    
    try {
      // Try to read database config from .env.local
      const envContent = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
      const dbHostMatch = envContent.match(/DB_HOST=["']?([^"'\r\n]+)/);
      const dbUserMatch = envContent.match(/DB_USER=["']?([^"'\r\n]+)/);
      const dbPassMatch = envContent.match(/DB_PASSWORD=["']?([^"'\r\n]*)/);
      const dbNameMatch = envContent.match(/DB_NAME=["']?([^"'\r\n]+)/);
      
      if (dbHostMatch && dbUserMatch && dbNameMatch) {
        console.log('  Attempting database connection...');
        pool = createPool({
          host: dbHostMatch[1],
          user: dbUserMatch[1],
          password: dbPassMatch ? dbPassMatch[1] : '',
          database: dbNameMatch[1],
          waitForConnections: true,
          connectionLimit: 1
        });
        
        const [rows] = await pool.query('SHOW TABLES');
        console.log('  Database tables found:', rows.map(row => Object.values(row)[0]).join(', '));
        
        // Check cvs table specifically
        const [tables] = await pool.query("SHOW TABLES LIKE 'cvs'");
        if (tables.length > 0) {
          console.log('  CVs table exists');
          
          const [columns] = await pool.query('SHOW COLUMNS FROM cvs');
          const columnNames = columns.map(col => col.Field);
          console.log('  CVs table columns:', columnNames.join(', '));
        } else {
          console.log('  Warning: CVs table does not exist');
        }
      }
    } catch (dbError) {
      console.log('  Database connection error:', dbError.message);
    } finally {
      if (pool) {
        await pool.end();
      }
    }
  } catch (moduleError) {
    console.log('  Skipping database checks - mysql2 module not available');
  }
  
  console.log('\nDiagnostic complete!');
}

// Run the diagnostics
diagnoseApis();
