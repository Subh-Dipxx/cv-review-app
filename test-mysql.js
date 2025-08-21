// test-mysql.js - Test MySQL connectivity
require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function testMySQLConnection() {
  console.log('Testing MySQL connectivity...');
  
  // Get database settings from environment variables
  const dbSettings = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME
  };
  
  console.log(`Attempting to connect to MySQL database ${dbSettings.database} on ${dbSettings.host}`);
  console.log(`Using credentials: ${dbSettings.user}:********`);
  
  try {
    // Create a connection
    const connection = await mysql.createConnection({
      host: dbSettings.host,
      user: dbSettings.user,
      password: dbSettings.password,
      database: dbSettings.database
    });
    
    console.log(' Successfully connected to MySQL!');
    
    // Test a simple query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log(' Query test successful. Result:', rows[0].result);
    
    // Check for required tables
    console.log('Checking for required tables...');
    const [tables] = await connection.query('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log(' Warning: No tables found in database.');
    } else {
      console.log('Tables in database:');
      tables.forEach(table => {
        const tableName = Object.values(table)[0];
        console.log(`- ${tableName}`);
      });
    }
    
    await connection.end();
    return true;
  } catch (error) {
    console.error(' MySQL connection error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('MySQL server might not be running. Please start your MySQL server.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('Access denied. Check your username and password.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log(`Database "${dbSettings.database}" does not exist.`);
      console.log('Creating the database might solve this issue.');
    }
    
    return false;
  }
}

testMySQLConnection()
  .then(success => {
    if (success) {
      console.log('\nMySQL connection test completed successfully.');
    } else {
      console.log('\nMySQL connection test failed.');
      console.log('Please check your MySQL server and connection settings in .env.local.');
    }
  })
  .catch(err => {
    console.error('Error running test:', err);
  });
