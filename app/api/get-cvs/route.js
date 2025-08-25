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
    const formattedRows = rows.map(row => ({
      id: row.id,
      fileName: row.file_name,
      category: row.category,
      summary: row.summary,
      yearsOfExperience: row.years_of_experience || 0,
      jobTitle: row.job_title || "Not specified",
      skills: row.skills ? row.skills.split(', ') : [],
      professionalSummary: row.professional_summary,
      collegeName: row.college_name || "",
      email: row.email || "",
      phone: row.phone || "",
      name: row.name || "",
      recommendedRoles: row.recommended_roles
        ? Array.isArray(row.recommended_roles)
          ? row.recommended_roles
          : row.recommended_roles.split(',').map(r => r.trim()).filter(Boolean)
        : [],
      createdAt: row.created_at
    }));
    
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