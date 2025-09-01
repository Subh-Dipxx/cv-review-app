import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request) {
  try {
    // Get the current user's ID from Clerk
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: User not authenticated" }, { status: 401 });
    }
    
    console.log(`Exporting CVs for user ${userId}`);
    
    console.log(`Exporting CVs for user ${userId}`);
    
    // Connect to the database
    const connection = await pool.getConnection();
    
    try {
      // Get only the current user's CVs from the database
      const [rows] = await connection.execute(
        "SELECT * FROM cvs WHERE user_id = ? ORDER BY id DESC",
        [userId]
      );
      
      console.log(`Exporting ${rows.length} CVs to CSV`);
      
      // Convert to CSV
      const csv = convertToCSV(rows);
      
      // Set the filename with current date
      const now = new Date();
      const filename = `cv-data-${now.toISOString().split('T')[0]}.csv`;
      
      // Return as downloadable CSV file
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } finally {
      // Always release the connection
      connection.release();
    }
  } catch (error) {
    console.error("Error exporting CVs to CSV:", error);
    return NextResponse.json(
      { error: "Failed to export CVs to CSV" }, 
      { status: 500 }
    );
  }
}

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data || !data.length) {
    return 'No data';
  }
  
  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Process header row with special handling for columns that might need it
  const headerRow = headers.map(header => {
    console.log(`Converting column name: ${header}`);
    return `"${header}"`; // Wrap headers in quotes to handle commas
  }).join(',');
  
  // Process data rows
  const rows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      
      // Handle different data types
      if (value === null || value === undefined) {
        return '""';
      } else if (typeof value === 'string') {
        // Escape quotes by doubling them and wrap in quotes
        return `"${value.replace(/"/g, '""')}"`;
      } else if (value instanceof Date) {
        return `"${value.toISOString()}"`;
      } else if (typeof value === 'object') {
        // Convert objects/arrays to JSON strings
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      } else {
        return `"${value}"`;
      }
    }).join(',');
  }).join('\n');
  
  // Combine header and rows
  return `${headerRow}\n${rows}`;
}
