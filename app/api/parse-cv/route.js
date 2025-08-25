import { NextResponse } from "next/server";
import parsePdf from "../../lib/pdf-parser";

export async function POST(request) {
  try {
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

        // Use the wrapper instead of direct pdf-parse
        const data = await parsePdf(buffer);

        let name = "";
        let yearsOfExperience = 0;
        let recommendedRoles = [];

        // Simple extraction logic (replace with your own parsing)
        if (data.text) {
          // Try to extract name
          const nameMatch = data.text.match(/Name[:\s]+([A-Za-z .]+)/i);
          name = nameMatch ? nameMatch[1].trim() : "";
          // Try to extract years of experience
          const expMatch = data.text.match(/([0-9]+)\s+years? of experience/i);
          yearsOfExperience = expMatch ? parseInt(expMatch[1]) : 0;
          // Try to extract recommended roles
          const rolesMatch = data.text.match(/Roles?[:\s]+([A-Za-z, .]+)/i);
          recommendedRoles = rolesMatch ? rolesMatch[1].split(',').map(r => r.trim()) : [];
        }

        // Store summary in DB
        try {
          const connection = await pool.getConnection();
          await connection.query(
            `INSERT INTO cvs (file_name, name, years_of_experience, recommended_roles, summary, category) VALUES (?, ?, ?, ?, ?, ?)`,
            [file.name, name, yearsOfExperience, recommendedRoles.join(','), data.text, "resume"]
          );
          connection.release();
        } catch (dbErr) {
          console.error("DB insert error:", dbErr);
        }

        if (!data || !data.text || data.text.trim().length === 0) {
          results.push({
            fileName: file.name,
            text: `No text could be extracted from ${file.name}.`,
          });
        } else {
          results.push({
            fileName: file.name,
            text: data.text,
            name,
            yearsOfExperience,
            recommendedRoles
          });
        }
      } catch (err) {
        results.push({
          fileName: file.name,
          text: `Error processing ${file.name}: ${err.message}`,
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process PDFs: ${error.message}` },
      { status: 500 }
    );
  }
}