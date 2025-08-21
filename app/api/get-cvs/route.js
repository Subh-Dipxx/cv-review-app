import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function GET() {
  let connection;
  try {
    // Add timeout to connection request
    connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection timeout")), 5000)
      )
    ]);
    
    // Ensure table exists with ALL required columns
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
    
    // Use error handling for the query
    let rows;
    try {
      [rows] = await connection.query(`
        SELECT 
          id, file_name, category, summary, years_of_experience, 
          job_title, skills, professional_summary, college_name, 
          email, phone, name, created_at 
        FROM cvs 
        ORDER BY created_at DESC
      `);
    } catch (queryError) {
      console.error("Query error:", queryError);
      return NextResponse.json(
        { error: `Database query failed: ${queryError.message}` },
        { status: 500 }
      );
    }
    
    // Format the response with safety checks
    const formattedRows = rows.map(row => ({
      id: row.id,
      fileName: row.file_name || "",
      category: row.category || "Unknown",
      summary: row.summary || "",
      yearsOfExperience: row.years_of_experience || 0,
      jobTitle: row.job_title || "Not specified",
      skills: row.skills ? row.skills.split(', ') : [],
      professionalSummary: row.professional_summary || row.summary || "",
      collegeName: row.college_name || "",
      email: row.email || "",
      phone: row.phone || "",
      name: row.name || "",
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
        await connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError.message);
      }
    }
  }
}