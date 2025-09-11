const fs = require('fs');
const { execSync } = require('child_process');

async function testAPI() {
  const testFile = 'test-data/john-smith-cv.txt';
  if (!fs.existsSync(testFile)) {
    console.error(`Test file not found: ${testFile}`);
    return;
  }

  // Simple curl command to test the API
  const command = `curl -X POST -F "files=@${testFile}" http://localhost:3000/api/process-cv`;
  
  try {
    console.log(`Executing: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    console.log('API Response:', result);
    
    // Parse the response
    const response = JSON.parse(result);
    console.log(`Processed ${response.categorized?.length || 0} CVs`);
    
    if (response.categorized && response.categorized.length > 0) {
      console.log('First CV result:', response.categorized[0]);
    }
  } catch (error) {
    console.error('Error testing API:', error.message);
  }
}

testAPI();
