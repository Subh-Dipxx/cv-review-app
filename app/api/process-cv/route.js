// import { NextResponse } from "next/server";

// export async function POST(request) {
//   try {
//     const { results } = await request.json();
//     if (!results || !Array.isArray(results)) {
//       console.error("Invalid input received:", results);
//       return NextResponse.json({ error: "Invalid input" }, { status: 400 });
//     }

//     const categorized = results.map((cv, index) => {
//       try {
//         const text = cv.text.toLowerCase();
//         let category = "Other";
//         if (text.includes("qa") || text.includes("testing") || text.includes("selenium")) {
//           category = "QA Engineer";
//         } else if (
//           text.includes("business analyst") ||
//           text.includes("requirements") ||
//           text.includes("stakeholder")
//         ) {
//           category = "BA Engineer";
//         }

//         const summary = text
//           .split("\n")
//           .filter((line) => line.trim().length > 10)
//           .slice(0, 3)
//           .join(" ")
//           .substring(0, 150) + "...";

//         return {
//           fileName: cv.fileName,
//           category,
//           summary,
//         };
//       } catch (cvError) {
//         console.error(`Error processing CV ${cv.fileName}:`, cvError.message);
//         return {
//           fileName: cv.fileName,
//           category: "Error",
//           summary: "Failed to process CV",
//         };
//       }
//     });

//     return NextResponse.json({ categorized });
//   } catch (error) {
//     console.error("Error in process-cv API:", error.message);
//     return NextResponse.json(
//       { error: `Failed to process CVs: ${error.message}` },
//       { status: 500 }
//     );
//   }
// }


import { NextResponse } from "next/server";
import pool from "../../lib/db";

export async function POST(request) {
  let connection;
  try {
    // Parse request body safely
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (jsonError) {
      return NextResponse.json({ 
        error: `Invalid JSON in request: ${jsonError.message}` 
      }, { status: 400 });
    }

    const { results } = requestBody;
    
    if (!results || !Array.isArray(results)) {
      return NextResponse.json({ 
        error: "Invalid input: results must be an array" 
      }, { status: 400 });
    }

    // Get database connection with error handling
    try {
      connection = await pool.getConnection();
    } catch (dbError) {
      console.error("Database connection error:", dbError);
      return NextResponse.json({ 
        error: `Database connection error: ${dbError.message}` 
      }, { status: 500 });
    }

    // Ensure table exists
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS cvs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          file_name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL,
          summary TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (tableError) {
      console.error("Table creation error:", tableError);
      return NextResponse.json({ 
        error: `Failed to create table: ${tableError.message}` 
      }, { status: 500 });
    }

    // Process each CV
    const categorized = [];
    
    for (const cv of results) {
      try {
        if (!cv || !cv.fileName || !cv.text || typeof cv.text !== 'string') {
          categorized.push({
            fileName: cv.fileName || "Unknown",
            category: "Error",
            summary: "Invalid CV data",
          });
          continue;
        }

        const text = cv.text.toLowerCase();
        let category = "Other";
        
        // Categorize based on keywords
        if (text.includes("qa") || text.includes("testing") || text.includes("quality assurance")) {
          category = "QA Engineer";
        } else if (text.includes("business analyst") || text.includes("requirements")) {
          category = "BA Engineer";
        } else if (text.includes("developer") || text.includes("programmer") || text.includes("software engineer")) {
          category = "Software Developer";
        }

        // Generate summary
        const lines = cv.text.split(/[\n\r]+/).filter(line => line.trim().length > 10);
        const summary = lines.slice(0, 3).join(" ").substring(0, 250) + "...";
        console.log("Inserting CV:", { fileName: cv.fileName, category, summary });

        // Save to database
        try {
          await connection.query(
            "INSERT INTO cvs (file_name, category, summary) VALUES (?, ?, ?)",
            [cv.fileName, category, summary]
          );
        } catch (insertError) {
          console.error(`Database insert error for ${cv.fileName}:`, insertError.message);
          // Continue processing even if DB insert fails
        }

        categorized.push({
          fileName: cv.fileName,
          category,
          summary,
        });
      } catch (cvError) {
        categorized.push({
          fileName: cv.fileName || "Unknown",
          category: "Error",
          summary: `Failed to process: ${cvError.message}`,
        });
      }
    }

    return NextResponse.json({ categorized });
  } catch (error) {
    console.error("Process CV API error:", error);
    return NextResponse.json({ 
      error: `Failed to process CVs: ${error.message}` 
    }, { status: 500 });
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error("Error releasing connection:", releaseError);
      }
    }
  }
}