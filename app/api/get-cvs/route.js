import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function GET() {
  let connection;
  try {
    connection = await pool.getConnection();
    
    // Ensure table exists before querying
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cvs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const [rows] = await connection.query("SELECT * FROM cvs ORDER BY created_at DESC");
    return NextResponse.json({ cvs: rows });
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