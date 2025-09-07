import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { getAuth } from "@clerk/nextjs/server";

export async function GET(request) {
  let connection;
  try {
    console.log('Attempting database connection in get-processed-cvs');
    
    // Get the current user's ID from Clerk
    const { userId } = getAuth(request);
    console.log('Current user ID:', userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }
    
    // Add timeout to database connection
    connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Database connection timeout")), 5000)
      )
    ]);
    
    console.log('Connected to database in get-processed-cvs');
    
    // Modified query to filter by user_id
    // Only fetch CVs belonging to the current user
    const [rows] = await connection.query(`
      SELECT * FROM cvs
      WHERE user_id = ? AND id IN (
        SELECT MAX(id) FROM cvs
        WHERE user_id = ?
        GROUP BY file_name
      )
      ORDER BY created_at DESC
    `, [userId, userId]);
    
    console.log(`Retrieved ${rows.length} processed CVs from database`);
    
    // Directly map from database format to the exact same format used by the Process CV feature
    const processedCVs = rows.map(row => {
      console.log('Raw CV data:', row);
      
      // Parse skills and recommended roles from comma-separated strings to arrays
      const skills = row.skills ? row.skills.split(',').map(s => s.trim()) : [];
      
      let recommendedRoles = [];
      if (row.recommended_roles && row.recommended_roles.trim() && row.recommended_roles !== 'No roles') {
        try {
          // Check if it's a JSON array string
          if (row.recommended_roles.startsWith('[') && row.recommended_roles.endsWith(']')) {
            recommendedRoles = JSON.parse(row.recommended_roles);
          } else {
            // Otherwise, split by commas and filter out empty values
            recommendedRoles = row.recommended_roles
              .split(',')
              .map(r => r.trim())
              .filter(r => r && r !== 'No roles' && r !== 'General' && r !== '');
          }
        } catch (e) {
          console.error('Error parsing roles:', e);
          recommendedRoles = row.recommended_roles
            .split(',')
            .map(r => r.trim())
            .filter(r => r && r !== 'No roles' && r !== 'General' && r !== '');
        }
      }
      
      // If still no recommended roles, show a helpful message
      if (recommendedRoles.length === 0) {
        recommendedRoles = ['Click "Process CV" to generate roles'];
      }
      
      // Extract name from summary if name field is empty
      let extractedName = row.name || '';
      
      if (!extractedName && row.summary) {
        // Try to extract name from the first few lines of the summary
        const summaryLines = row.summary.split('\n').filter(line => line.trim());
        if (summaryLines.length > 0) {
          // Usually the name is in the first non-empty line
          const possibleNameLine = summaryLines.find(line => 
            line.trim() && 
            !line.includes('@') && // Skip email lines
            !line.includes('http') && // Skip URLs
            !line.match(/^\d/) // Skip lines starting with numbers
          );
          
          if (possibleNameLine) {
            extractedName = possibleNameLine.trim();
            
            // If the name is all caps, convert to title case
            if (extractedName === extractedName.toUpperCase()) {
              extractedName = extractedName
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            }
            
            console.log(`Extracted name from summary: "${extractedName}"`);
          }
        }
      }
      
      return {
        id: row.id,
        pdfName: row.file_name,
        name: extractedName || 'Unknown Candidate',
        candidateName: extractedName || 'Unknown Candidate',
        email: row.email,
        phone: row.phone,
        education: row.professional_summary,
        professionalSummary: row.professional_summary,
        yearsOfExperience: row.years_of_experience || 0,
        experience: row.years_of_experience || 0,
        role: row.job_title || 'Not Specified',
        skills: skills,
        summary: row.summary,
        recommendedRoles: recommendedRoles
      };
    });
    
    return NextResponse.json({ processedCVs });
  } catch (error) {
    console.error("Error in get-processed-cvs API:", error.message);
    
    // Provide more specific error messages based on error type
    let errorMessage = "An unexpected error occurred while fetching CVs.";
    let statusCode = 500;
    
    if (error.code === 'ECONNREFUSED' || error.message.includes('timeout') || error.code === 'ER_ACCESS_DENIED_ERROR') {
      errorMessage = "Could not connect to the database. Please check your database connection.";
      statusCode = 503; // Service Unavailable
    } else if (error.code === 'ER_NO_SUCH_TABLE') {
      errorMessage = "The CVs database table does not exist. Please ensure the database is properly set up.";
      statusCode = 500;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message,
        code: error.code || 'UNKNOWN'
      },
      { status: statusCode }
    );
  } finally {
    if (connection) {
      try {
        connection.release();
        console.log("Database connection released in get-processed-cvs");
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError.message);
      }
    }
  }
}
