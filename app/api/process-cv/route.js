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
    const { results } = await request.json();
    if (!results || !Array.isArray(results)) {
      console.error("Invalid input received:", results);
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Get database connection with timeout
    const connectionPromise = pool.getConnection();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );
    
    connection = await Promise.race([connectionPromise, timeoutPromise]);
    
    // Ensure table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cvs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    const categorized = [];
    
    for (const cv of results) {
      try {
        // Handle completely empty or invalid CVs
        if (!cv || !cv.fileName) {
          console.warn('Invalid CV object:', cv);
          continue;
        }

        let category = "Other";
        let summary = "No content available";

        if (!cv.text || cv.text.trim().length === 0) {
          category = "Error";
          summary = "No text content available";
        } else {
          const text = cv.text.toLowerCase();
          const cleanText = text.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          // Categorization logic
          if (cleanText.length < 20) {
            category = "Incomplete/Short Document";
            summary = "Document too short to analyze";
          } else {
            // Comprehensive categorization
            if (cleanText.includes("qa") || cleanText.includes("testing") || cleanText.includes("selenium") || 
                cleanText.includes("quality assurance") || cleanText.includes("test automation")) {
              category = "QA Engineer";
            } else if (
              cleanText.includes("business analyst") || cleanText.includes("requirements") ||
              cleanText.includes("stakeholder") || cleanText.includes("ba ") ||
              cleanText.includes("business analysis")
            ) {
              category = "BA Engineer";
            } else if (
              cleanText.includes("developer") || cleanText.includes("programmer") ||
              cleanText.includes("software engineer") || cleanText.includes("coding") ||
              cleanText.includes("javascript") || cleanText.includes("python") || cleanText.includes("java")
            ) {
              category = "Software Developer";
            } else if (
              cleanText.includes("project manager") || cleanText.includes("scrum master") ||
              cleanText.includes("agile") || cleanText.includes("project management")
            ) {
              category = "Project Manager";
            } else if (
              cleanText.includes("data analyst") || cleanText.includes("data scientist") ||
              cleanText.includes("machine learning") || cleanText.includes("sql")
            ) {
              category = "Data Analyst";
            } else if (
              cleanText.includes("designer") || cleanText.includes("ui") || cleanText.includes("ux")
            ) {
              category = "Designer";
            } else if (
              cleanText.includes("devops") || cleanText.includes("cloud") || 
              cleanText.includes("aws") || cleanText.includes("docker")
            ) {
              category = "DevOps Engineer";
            }

            // Create summary
            const lines = cv.text.split(/[\n\r]+/).filter(line => line.trim().length > 5);
            if (lines.length > 0) {
              const relevantLines = lines
                .filter(line => line.trim().length > 10 && line.trim().length < 200)
                .slice(0, 3)
                .map(line => line.trim());
              
              summary = relevantLines.join(". ").substring(0, 300);
              if (summary.length === 300) summary += "...";
              
              if (!summary) {
                summary = `${category} document with ${cv.text.length} characters`;
              }
            }
          }
        }

        // Sanitize data
        const sanitizedFileName = (cv.fileName || 'Unknown').substring(0, 250);
        const sanitizedSummary = summary.substring(0, 1000);
        
        // Save to database
        try {
          await connection.query(
            "INSERT INTO cvs (file_name, category, summary) VALUES (?, ?, ?)",
            [sanitizedFileName, category, sanitizedSummary]
          );
        } catch (dbError) {
          console.error(`Database error for ${cv.fileName}:`, dbError.message);
          // Continue processing even if DB save fails
        }

        categorized.push({
          fileName: cv.fileName,
          category,
          summary,
        });
      } catch (cvError) {
        console.error(`Error processing CV ${cv.fileName}:`, cvError.message);
        categorized.push({
          fileName: cv.fileName || 'Unknown File',
          category: "Error",
          summary: `Processing failed: ${cvError.message}`,
        });
      }
    }

    return NextResponse.json({ categorized });
  } catch (error) {
    console.error("Error in process-cv API:", error.message);
    return NextResponse.json(
      { error: `Failed to process CVs: ${error.message}` },
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