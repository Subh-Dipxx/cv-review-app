import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Ensure table exists before querying, add role and recommended_roles columns if missing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cvs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        content_hash VARCHAR(64) UNIQUE,
        category VARCHAR(100) NOT NULL,
        summary TEXT,
        years_of_experience INT DEFAULT 0,
        job_title VARCHAR(100),
        skills TEXT,
        professional_summary TEXT,
        college_name VARCHAR(255),
        email VARCHAR(255),
        phone VARCHAR(50),
        name VARCHAR(255),
        recommended_roles TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const [rows] = await connection.query(`
      SELECT 
        id, file_name, category, summary, years_of_experience, 
        job_title, skills, professional_summary, college_name, 
        email, phone, name, recommended_roles, created_at 
      FROM cvs 
      ORDER BY created_at DESC
    `);
    
    // Format the response
    // Add debugging to see raw data
    console.log('Raw database rows:', JSON.stringify(rows));
    
    const formattedRows = rows.map(row => {
      // Process recommendedRoles in a consistent way
      let recommendedRoles = [];
      if (row.recommended_roles) {
        try {
          // First check if it's already a valid JSON array
          if (row.recommended_roles.startsWith('[') && row.recommended_roles.endsWith(']')) {
            recommendedRoles = JSON.parse(row.recommended_roles);
          } else {
            // Otherwise split by commas
            recommendedRoles = row.recommended_roles.split(',').map(r => r.trim()).filter(Boolean);
          }
        } catch (e) {
          console.error('Error parsing recommended roles:', e);
          recommendedRoles = row.recommended_roles.split(',').map(r => r.trim()).filter(Boolean);
        }
      }

      // Don't add any default values - only return what's actually in the database
      return {
        id: row.id,
        fileName: row.file_name,
        category: row.category,
        summary: row.summary,
        // Use raw values from database without defaults
        yearsOfExperience: row.years_of_experience,
        experience: row.years_of_experience,
        jobTitle: row.job_title,
        role: row.job_title,
        skills: row.skills ? row.skills.split(', ') : [],
        professionalSummary: row.professional_summary,
        education: row.professional_summary,
        collegeName: row.college_name,
        email: row.email,
        phone: row.phone,
        name: row.name,
        candidateName: row.name,
        recommendedRoles: recommendedRoles,
        createdAt: row.created_at
      };
    });
    
    return NextResponse.json({ cvs: formattedRows });
  } catch (error) {
    console.error("Error in get-cvs API:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch CVs: ${error.message}` },
      { status: 500 }
    );
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError.message);
      }
    }
  }
}
