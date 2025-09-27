import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { getAuth } from "@clerk/nextjs/server";
import { downloadFileFromSupabase } from "../../lib/supabase";

export async function GET(request) {
  let connection;
  
  try {
    const { searchParams } = new URL(request.url);
    const resumeId = searchParams.get('id');
    
    console.log(`Download request for resume ID: ${resumeId}`);
    
    if (!resumeId) {
      return NextResponse.json({ error: "Resume ID is required" }, { status: 400 });
    }
    
    // Get the current user's ID from Clerk (might be null in keyless mode)
    const { userId } = getAuth(request);
    const effectiveUserId = userId || 'keyless-user';
    
    console.log(`Effective user ID: ${effectiveUserId}`);
    
    // Get database connection
    connection = await pool.getConnection();
    
    // Check if the resume exists and get Supabase file path
    const query = `
      SELECT file_name, supabase_file_path, created_at
      FROM cvs 
      WHERE id = ? AND user_id = ?
    `;
    
    const [results] = await connection.execute(query, [resumeId, effectiveUserId]);
    
    if (results.length === 0) {
      console.log(`Resume not found for ID: ${resumeId}, user: ${effectiveUserId}`);
      return NextResponse.json({ error: "Resume not found or access denied" }, { status: 404 });
    }
    
    const resume = results[0];
    
    // Check if file path exists
    if (!resume.supabase_file_path) {
      console.log(`File path not found for resume ID: ${resumeId}`);
      return NextResponse.json({ 
        error: "File not available for download", 
        message: "This CV was uploaded before file storage was enabled. Only newly uploaded CVs can be downloaded."
      }, { status: 404 });
    }
    
    // Download file from Supabase
    const fileBlob = await downloadFileFromSupabase(resume.supabase_file_path);
    
    // Create filename - use original name or create one based on timestamp
    const fileName = resume.file_name || `resume_${resumeId}_${new Date(resume.created_at).toISOString().split('T')[0]}.pdf`;
    
    console.log(`Serving file: ${fileName}, size: ${fileBlob.size} bytes`);
    
    // Convert blob to buffer for response
    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Set appropriate headers for file download
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`);
    headers.set('Content-Length', buffer.length.toString());
    
    return new NextResponse(buffer, {
      status: 200,
      headers: headers,
    });
    
  } catch (error) {
    console.error('Error downloading resume:', error);
    return NextResponse.json({ 
      error: "Failed to download resume",
      details: error.message 
    }, { status: 500 });
  } finally {
    if (connection) {
      connection.release();
    }
  }
}