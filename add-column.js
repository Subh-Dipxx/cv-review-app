// Database migration script to add file_data column
import pool from './app/lib/db.js';

async function addFileDataColumn() {
  let connection;
  
  try {
    console.log('🔧 Adding file_data column to cvs table...');
    
    connection = await pool.getConnection();
    
    // Check if column already exists
    const [columns] = await connection.query("SHOW COLUMNS FROM cvs LIKE 'file_data'");
    
    if (columns.length > 0) {
      console.log('✅ file_data column already exists!');
      return;
    }
    
    // Add the column
    await connection.query("ALTER TABLE cvs ADD COLUMN file_data LONGBLOB AFTER summary");
    
    console.log('✅ Successfully added file_data column to cvs table!');
    console.log('📥 Download functionality is now enabled for new CV uploads.');
    
  } catch (error) {
    console.error('❌ Error adding file_data column:', error.message);
  } finally {
    if (connection) {
      connection.release();
    }
    process.exit(0);
  }
}

addFileDataColumn();