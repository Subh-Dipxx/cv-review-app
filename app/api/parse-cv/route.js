import { NextResponse } from "next/server";
import parsePdf from "../../lib/pdf-parser";
import { getAuth } from "@clerk/nextjs/server";

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: User not authenticated" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Import pool for DB access
    const pool = require('../../lib/db').default;
    const results = [];
    for (const file of files) {
      try {
        // Validate file type
        if (file.type !== "application/pdf") {
          results.push({
            fileName: file.name,
            text: `Invalid file type: ${file.name}. Only PDF files are allowed.`,
          });
          continue;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          results.push({
            fileName: file.name,
            text: `File too large: ${file.name}. Maximum size is 5MB.`,
          });
          continue;
        }
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentHash = require('crypto').createHash('sha256').update(buffer).digest('hex');

        // Use the wrapper instead of direct pdf-parse
        const data = await parsePdf(buffer);

        let name = "";
        let yearsOfExperience = 0;
        let recommendedRoles = [];
        let email = "";
        let phone = "";
        let education = "";

        if (data.text) {
          // Name extraction: Try multiple patterns
          let nameMatch = data.text.match(/Name[:\s]+([A-Za-z .]+)/i);
          if (!nameMatch) {
            nameMatch = data.text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/); // Fallback: first capitalized full name
          }
          name = nameMatch ? nameMatch[1].trim() : "";

          // Experience extraction: Try multiple patterns
          let expMatch = data.text.match(/([0-9]+)\s+years? of experience/i);
          if (!expMatch) {
            expMatch = data.text.match(/Experience[:\s]+([0-9]+)\s+years?/i);
          }
          yearsOfExperience = expMatch ? parseInt(expMatch[1]) : 0;

          // Roles extraction: Try multiple patterns
          let rolesMatch = data.text.match(/Roles?[:\s]+([A-Za-z, .]+)/i);
          if (!rolesMatch) {
            rolesMatch = data.text.match(/Position[s]?:?\s*([A-Za-z, .]+)/i);
          }
          recommendedRoles = rolesMatch ? rolesMatch[1].split(',').map(r => r.trim()) : [];

          // Email extraction
          const emailMatch = data.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          email = emailMatch ? emailMatch[0] : "";

          // Phone extraction
          const phoneMatch = data.text.match(/(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}/);
          phone = phoneMatch ? phoneMatch[0] : "";

          // Education extraction
          const eduMatch = data.text.match(/Education[:\s]+([A-Za-z0-9, .]+)/i);
          education = eduMatch ? eduMatch[1].trim() : "";
        }

        // Store summary in DB only if not already present
        try {
          const connection = await pool.getConnection();
          
          // First check if necessary columns exist, then add them if they don't
          try {
            // Check if content_hash column exists
            const [hashColumns] = await connection.query(`
              SHOW COLUMNS FROM cvs LIKE 'content_hash'
            `);
            
            if (hashColumns.length === 0) {
              // Column doesn't exist, add it
              await connection.query(`
                ALTER TABLE cvs ADD COLUMN content_hash VARCHAR(64)
              `);
              console.log('Added content_hash column');
            } else {
              console.log('content_hash column already exists');
            }
            
            // Check if user_id column exists
            const [userIdColumns] = await connection.query(`
              SHOW COLUMNS FROM cvs LIKE 'user_id'
            `);
            
            if (userIdColumns.length === 0) {
              // Column doesn't exist, add it
              await connection.query(`
                ALTER TABLE cvs ADD COLUMN user_id VARCHAR(64)
              `);
              console.log('Added user_id column');
            } else {
              console.log('user_id column already exists');
            }
          } catch (alterError) {
            console.warn('Could not check or alter table:', alterError.message);
          }
          
          // Check for existing file for this user
          let existing = [];
          try {
            [existing] = await connection.query(
              `SELECT id FROM cvs WHERE file_name = ? AND user_id = ? LIMIT 1`,
              [file.name, userId]
            );
          } catch (queryError) {
            console.error('Error checking for existing record:', queryError);
            // Proceeding with empty existing array
          }
          
          let cvId;
          if (!existing || existing.length === 0) {
            // Insert new record with user_id
            const [result] = await connection.query(
              `INSERT INTO cvs (file_name, summary, category, user_id, content_hash) VALUES (?, ?, ?, ?, ?)`,
              [file.name, data.text, "resume", userId, contentHash]
            );
            cvId = result.insertId;
            console.log(`Inserted new CV with ID ${cvId} for user ${userId}`);
          } else {
            cvId = existing[0].id;
            // Update the existing record
            await connection.query(
              `UPDATE cvs SET summary = ?, content_hash = ? WHERE id = ?`,
              [data.text, contentHash, cvId]
            );
            console.log(`Updated existing CV with ID ${cvId} for user ${userId}`);
          }
          connection.release();
          
          // Always ensure we have a valid CV ID and text before adding to results
          if (cvId && data && data.text) {
            console.log(`Successfully processed ${file.name} with ID ${cvId}`);
            results.push({
              fileName: file.name,
              text: data.text,
              cvId: cvId
            });
          }
        } catch (dbErr) {
          console.error("DB insert error:", dbErr);
        }

        if (!data || !data.text || data.text.trim().length === 0) {
          console.warn(`No text could be extracted from ${file.name}`);
          results.push({
            fileName: file.name,
            text: `No text could be extracted from ${file.name}.`,
          });
        } 
      } catch (err) {
        results.push({
          fileName: file.name,
          text: `Error processing ${file.name}: ${err.message}`,
        });
      }
    }

    // Log and filter the results to ensure we only return valid entries
    const validResults = results.filter(r => r.cvId || (r.text && !r.text.startsWith("Error")));
    console.log(`Successfully processed ${validResults.length} out of ${results.length} files`);
    
    return NextResponse.json({ 
      results: validResults,
      total: results.length,
      successful: validResults.length
    });
  } catch (error) {
    console.error("Fatal error in parse-cv API:", error);
    return NextResponse.json(
      { error: `Failed to process PDFs: ${error.message}` },
      { status: 500 }
    );
  }
}