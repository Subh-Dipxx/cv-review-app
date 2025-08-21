import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function GET(request) {
  let connection;
  console.log("GET /api/get-summaries - Request received");
  
  try {
    // Verify database connection
    console.log("Attempting to connect to database...");
    connection = await pool.getConnection();
    console.log("Database connection successful");
    
    // Check if table exists and add missing columns if needed
    try {
      console.log("Checking and updating table structure if needed...");
      
      // First, ensure the table exists
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cvs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          summary TEXT,
          years_of_experience INT DEFAULT 0,
          job_title VARCHAR(255),
          skills TEXT,
          professional_summary TEXT,
          college_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          name VARCHAR(255),
          projects TEXT,
          recommended_roles TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Check for and add missing columns
      const columnsToCheck = [
        { name: 'professional_summary', type: 'TEXT' },
        { name: 'college_name', type: 'VARCHAR(255)' },
        { name: 'projects', type: 'TEXT' },
        { name: 'recommended_roles', type: 'TEXT' },
        { name: 'email', type: 'VARCHAR(255)' },
        { name: 'name', type: 'VARCHAR(255)' },
        { name: 'phone', type: 'VARCHAR(50)' },
        { name: 'job_title', type: 'VARCHAR(255)' },
        { name: 'skills', type: 'TEXT' },
        { name: 'years_of_experience', type: 'INT', default: '0' }
      ];
      
      for (const column of columnsToCheck) {
        const [columns] = await connection.query(`SHOW COLUMNS FROM cvs LIKE '${column.name}'`);
        if (columns.length === 0) {
          console.log(`Adding missing '${column.name}' column`);
          let query = `ALTER TABLE cvs ADD COLUMN ${column.name} ${column.type}`;
          if (column.default !== undefined) {
            query += ` DEFAULT ${column.default}`;
          }
          await connection.query(query);
        }
      }
      
      console.log("Table structure verified");
    } catch (tableError) {
      console.error("Error checking/updating table:", tableError);
      return NextResponse.json({ 
        error: "Database table error",
        details: tableError.message 
      }, { status: 500 });
    }
    
    // Get all summaries from the database with a fully resilient query
    console.log("Querying database for CV summaries...");
    const [rows] = await connection.query(`
      SELECT 
        id, 
        file_name, 
        category, 
        COALESCE(summary, '') as summary, 
        COALESCE(professional_summary, '') as professional_summary,
        COALESCE(college_name, '') as college_name, 
        COALESCE(email, '') as email, 
        COALESCE(name, '') as name, 
        COALESCE(job_title, '') as job_title,
        COALESCE(years_of_experience, 0) as years_of_experience,
        created_at 
      FROM cvs 
      ORDER BY created_at DESC
    `);
    
    console.log(`Found ${rows.length} summaries in database`);
    
    // Format the response
    const summaries = rows.map(row => {
      // Handle potentially null or undefined values
      const safeRow = {
        id: row.id || 0,
        file_name: row.file_name || 'Unknown',
        category: row.category || 'Other',
        summary: row.summary || '',
        professional_summary: row.professional_summary || row.summary || '',
        college_name: row.college_name || '',
        email: row.email || '',
        name: row.name || '',
        created_at: row.created_at || new Date()
      };

      // Parse recommendedRoles safely
      let recommendedRoles = [];
      try {
        if (row.recommended_roles) {
          if (typeof row.recommended_roles === 'string') {
            recommendedRoles = JSON.parse(row.recommended_roles);
          } else {
            recommendedRoles = row.recommended_roles;
          }
        }
      } catch (e) {
        console.error("Error parsing recommendedRoles:", e);
      }

      // Ensure valid structure for recommendedRoles
      if (!Array.isArray(recommendedRoles)) {
        recommendedRoles = [];
      }

      // Convert string items to objects if needed
      recommendedRoles = recommendedRoles.map(role => {
        if (typeof role === 'string') {
          return { name: role, percentage: 70 };
        } else if (role && typeof role === 'object') {
          return {
            name: role.name || 'Unknown',
            percentage: Number(role.percentage) || 70
          };
        }
        return { name: 'Unknown', percentage: 70 };
      });

      return {
        id: safeRow.id,
        fileName: safeRow.file_name,
        category: safeRow.category,
        summary: safeRow.summary,
        professionalSummary: safeRow.professional_summary,
        collegeName: safeRow.college_name,
        email: safeRow.email,
        name: safeRow.name,
        createdAt: safeRow.created_at,
        recommendedRoles
      };
    });
    
    console.log("Returning JSON response with summaries");
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error("Error in get-summaries API:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json({ 
      error: "Failed to fetch summaries",
      details: error.message,
      code: error.code
    }, { status: 500 });
  } finally {
    if (connection) {
      try {
        console.log("Releasing database connection");
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
  }
}
