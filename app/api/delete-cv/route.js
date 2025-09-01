import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { getAuth } from "@clerk/nextjs/server";

export async function DELETE(request, { params }) {
  // Get the current user's ID from Clerk
  const { userId } = getAuth(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated" }, { status: 401 });
  }

  // Get the CV ID from the URL
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing CV ID" }, { status: 400 });
  }
  
  // Validate that id is a number
  const numericId = parseInt(id);
  if (isNaN(numericId)) {
    return NextResponse.json({ error: "Invalid CV ID format" }, { status: 400 });
  }

  try {
    console.log(`Attempting to delete CV with ID: ${id}`);
    
    // Connect to the database
    const connection = await pool.getConnection();
    
    try {
      // First check if this CV belongs to the current user
      const [cvs] = await connection.execute(
        "SELECT id FROM cvs WHERE id = ? AND user_id = ?",
        [numericId, userId]
      );
      
      if (cvs.length === 0) {
        return NextResponse.json({ error: "CV not found or you don't have permission to delete it" }, { status: 403 });
      }
      
      // Delete the CV
      const [result] = await connection.execute(
        "DELETE FROM cvs WHERE id = ? AND user_id = ?",
        [numericId, userId]
      );
      
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "CV not found" }, { status: 404 });
      }
      
      console.log(`Successfully deleted CV with ID: ${id}`);
      return NextResponse.json({ message: "CV deleted successfully" });
    } finally {
      // Always release the connection
      connection.release();
    }
  } catch (error) {
    console.error("Error deleting CV:", error);
    return NextResponse.json({ error: "Failed to delete CV" }, { status: 500 });
  }
}
