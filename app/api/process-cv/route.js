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
import { analyzeCvWithAI } from "../../lib/ai-service";

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

    // Ensure table exists with new fields
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

    // Process each CV
    const categorized = [];
    
    for (const cv of results) {
      try {
        // Skip invalid data
        if (!cv || typeof cv.fileName !== "string" || typeof cv.text !== "string" || cv.text.trim().length === 0) {
          categorized.push({
            fileName: cv.fileName || "Unknown",
            category: "Error",
            summary: "Invalid CV data",
          });
          continue;
        }

        // Check if OpenAI API key is configured properly
        const apiKeyConfigured = process.env.OPENAI_API_KEY && 
                               process.env.OPENAI_API_KEY !== "your-actual-api-key-here" && 
                               process.env.OPENAI_API_KEY.startsWith("sk-");

        // Use AI to analyze the CV only if API key is configured
        let aiAnalysis;
        let aiError = null;
        if (apiKeyConfigured) {
          try {
            aiAnalysis = await analyzeCvWithAI(cv.text);
            console.log("AI analysis successful for:", cv.fileName);
          } catch (error) {
            aiError = error;
            console.error("AI analysis failed:", error.message);
            
            // Check if it's a quota exceeded error
            const isQuotaError = error.message.includes("429") || 
                               error.message.includes("quota") || 
                               error.message.includes("rate limit");
            
            if (isQuotaError) {
              console.warn("OpenAI API quota exceeded - switching to basic analysis");
              aiAnalysis = null;
            } else {
              console.error("Other AI error:", error);
              aiAnalysis = null;
            }
          }
        } else {
          console.log("OpenAI API key not properly configured, using basic analysis");
          aiAnalysis = null;
        }

        // If AI analysis failed or was skipped, use basic analysis
        if (!aiAnalysis || !aiAnalysis.professionalSummary) {
          const text = cv.text.toLowerCase();
          
          // Don't use a generic prefix
          let summaryPrefix = "";
          
          // Extract more skills with keyword detection
          const skillKeywords = [
            'javascript', 'python', 'java', 'html', 'css', 'react', 'angular', 'vue', 
            'node', 'express', 'mongodb', 'sql', 'nosql', 'aws', 'azure', 'git', 
            'docker', 'kubernetes', 'agile', 'scrum', 'rest', 'api', 'testing', 
            'automation', 'ci/cd', 'mobile', 'android', 'ios', 'flutter', 'react native'
          ];
          
          const skills = [];
          skillKeywords.forEach(skill => {
            if (text.includes(skill)) {
              skills.push(skill.charAt(0).toUpperCase() + skill.slice(1));
            }
          });
          
          // Extract email with more inclusive regex
          const emailPattern = /[A-Za-z0-9._%+-]*[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
          const emailMatches = cv.text.match(emailPattern);
          let email = "";
          
          if (emailMatches && emailMatches.length > 0) {
            // Take the first valid email found
            email = emailMatches[0];
            
            // Only clean if email starts with many digits (like your case)
            if (/^\d{10,}/.test(email)) {
              // For emails like "7029193205guharoysubhadip2@gmail.com"
              // Extract just the part after the phone number
              const emailParts = email.match(/([a-zA-Z][a-zA-Z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/);
              if (emailParts) {
                email = emailParts[1];
              }
            }
          }
          
          // Try to extract name - look for common name patterns
          let name = "";
          const nameLines = cv.text.split('\n').slice(0, 5); // Usually name is at the top
          for (const line of nameLines) {
            const trimmedLine = line.trim();
            // Look for standalone lines with 2-3 words that might be names
            if (trimmedLine && 
                trimmedLine.split(' ').length >= 2 && 
                trimmedLine.split(' ').length <= 4 &&
                trimmedLine.length < 40 &&
                !/[0-9@]/.test(trimmedLine)) { // No numbers or @ signs in names
              name = trimmedLine;
              break;
            }
          }
          
          // Extract college name more effectively
          const educationKeywords = [
            'university', 'college', 'institute', 'school', 'academy',
            'bachelor', 'master', 'phd', 'degree', 'b.tech', 'b.e', 'm.tech', 'mba', 'b.sc', 'm.sc'
          ];
          
          // Keywords to avoid when extracting education
          const avoidKeywords = [
            'objective', 'summary', 'profile', 'experience', 'skills', 
            'projects', 'certification', 'contact', 'address', 'phone', 'email'
          ];
          
          let collegeName = "";
          const lines = cv.text.split('\n');
          
          // Look for lines containing education keywords
          for (const line of lines) {
            const lowerLine = line.toLowerCase().trim();
            
            // Skip if line contains words that indicate it's not about education
            if (avoidKeywords.some(keyword => lowerLine.includes(keyword))) {
              continue;
            }
            
            if (educationKeywords.some(keyword => lowerLine.includes(keyword))) {
              // Clean up the line
              collegeName = line.trim()
                .replace(/^[•\-\*\s]+/, '') // Remove bullet points at start
                .replace(/^\d+\.\s*/, '') // Remove numbering
                .replace(/\d{1,2}\/\d{4}.*$/, '') // Remove dates like 8/2022
                .replace(/\d{1,2}[-–]\d{4}.*$/, '') // Remove dates like 8-2022
                .replace(/\s+\d{4}(\s+[-–]\s+|\s+to\s+|\s+[-–]\s+present).*$/i, '') // Remove year ranges
                .replace(/\(.*?\)/g, '') // Remove anything in parentheses
                .replace(/\s+day$/i, '') // Remove trailing "day"
                .replace(/\s+present$/i, '') // Remove trailing "present"
                .replace(/\s+engineering\s+stratford$/i, '') // Remove specific text
                .trim();
              
              // Only set if we have something substantial
              if (collegeName && collegeName.length > 5) {
                break;
              }
            }
          }
          
          // Debug logging - moved after all variables are defined
          console.log(`For ${cv.fileName}:`);
          console.log(`  Email found: "${email}"`);
          console.log(`  College name: "${collegeName}"`);
          console.log(`  Name: "${name}"`);
          
          // Try to extract job title
          let jobTitle = "";
          const jobTitles = [
            'software developer', 'software engineer', 'web developer',
            'frontend developer', 'backend developer', 'full stack developer',
            'qa engineer', 'quality assurance', 'business analyst',
            'data analyst', 'data scientist', 'project manager'
          ];
          
          for (const title of jobTitles) {
            if (text.includes(title)) {
              jobTitle = title.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
              break;
            }
          }
          
          // Simple categorization
          let category = "Other";
          if (text.includes("qa") || text.includes("testing")) category = "QA Engineer";
          else if (text.includes("developer") || text.includes("programming") || 
                  text.includes("javascript") || text.includes("java") || 
                  text.includes("python") || text.includes("software engineer")) category = "Software Developer";
          else if (text.includes("business analyst")) category = "BA Engineer";
          
          // Create a proper professional summary from the text
          const bestSentences = cv.text
            .split(/[.!?]/)
            .filter(sentence => sentence.trim().length > 15 && sentence.trim().length < 150)
            .slice(0, 3);
            
          let professionalSummary = bestSentences.join('. ');
          if (!professionalSummary) {
            // Fallback summary if no good sentences found
            professionalSummary = `Professional`;
            if (collegeName) {
              professionalSummary += ` with education from ${collegeName}`;
            }
          }
          
          // Make sure summary has content
          const summary = professionalSummary || `Resume for ${cv.fileName}`;
          
          // Simple project extraction
          const projectKeywords = ["project", "developed", "created", "built", "implemented"];
          const projectSentences = cv.text.split(/[.!?]/)
            .filter(sentence => 
              projectKeywords.some(keyword => 
                sentence.toLowerCase().includes(keyword)
              )
            ).slice(0, 3);
          
          const projects = projectSentences.map(sentence => ({
            name: sentence.trim().split(" ").slice(0, 4).join(" ") + "...",
            description: sentence.trim()
          }));
          
          // Generate recommended roles based on keywords
          const recommendedRoles = [];
          
          if (text.includes("frontend") || text.includes("react") || text.includes("vue") || text.includes("angular")) {
            recommendedRoles.push("Frontend Developer");
          }
          if (text.includes("backend") || text.includes("node") || text.includes("express") || text.includes("api")) {
            recommendedRoles.push("Backend Developer");
          }
          if (text.includes("mobile") || text.includes("android") || text.includes("ios") || text.includes("flutter")) {
            recommendedRoles.push("Mobile Developer");
          }
          if (text.includes("data") || text.includes("analysis") || text.includes("analytics")) {
            recommendedRoles.push("Data Analyst");
          }
          if (text.includes("test") || text.includes("qa") || text.includes("quality")) {
            recommendedRoles.push("QA Engineer");
          }
          
          // Default recommended role based on category
          if (recommendedRoles.length === 0) {
            recommendedRoles.push(category);
          }
          
          aiAnalysis = {
            category: category || (jobTitle ? jobTitle.split(' ')[0] + " Professional" : "Other"),
            yearsOfExperience: 0, // Hard to determine without AI
            skills: skills,
            jobTitle: jobTitle || "Not specified",
            professionalSummary: professionalSummary, // Make sure this is defined
            collegeName: collegeName,
            email: email,
            phone: "", // As requested previously
            name: name,
            projects: projects,
            recommendedRoles: recommendedRoles
          };
        }
        
        // Extract all fields from AI analysis
        const category = aiAnalysis.category;
        const yearsOfExperience = aiAnalysis.yearsOfExperience;
        const jobTitle = aiAnalysis.jobTitle;
        const skills = aiAnalysis.skills;
        const professionalSummary = aiAnalysis.professionalSummary;
        const collegeName = aiAnalysis.collegeName;
        const email = aiAnalysis.email;
        const phone = aiAnalysis.phone;
        const name = aiAnalysis.name;
        const projects = aiAnalysis.projects || [];
        const recommendedRoles = aiAnalysis.recommendedRoles || [];
        
        // Create summary from AI analysis
        const summary = professionalSummary;
        
        // Prepare data for storage
        const skillsString = Array.isArray(skills) ? skills.join(', ') : '';
        const projectsString = JSON.stringify(projects);
        const recommendedRolesString = Array.isArray(recommendedRoles) ? recommendedRoles.join(', ') : '';

        // Save to database with all fields
        try {
          await connection.query(
            `INSERT INTO cvs (
              file_name, category, summary, years_of_experience, 
              job_title, skills, professional_summary, college_name, 
              email, phone, name, projects, recommended_roles
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              cv.fileName, category, summary, yearsOfExperience, 
              jobTitle, skillsString, professionalSummary, collegeName, 
              email, phone, name, projectsString, recommendedRolesString
            ]
          );
        } catch (dbError) {
          console.error(`Database error for ${cv.fileName}:`, dbError.message);
        }

        // Return enhanced data to frontend
        const resultData = {
          fileName: cv.fileName,
          category,
          summary,
          yearsOfExperience,
          jobTitle,
          skills,
          professionalSummary,
          collegeName,
          email,
          phone,
          name,
          projects,
          recommendedRoles
        };
        
        console.log(`Returning data for ${cv.fileName}:`, {
          email: resultData.email,
          collegeName: resultData.collegeName,
          name: resultData.name
        });
        
        categorized.push(resultData);
      } catch (cvError) {
        console.error(`Error processing CV ${cv.fileName}:`, cvError.message);
        categorized.push({
          fileName: cv.fileName || 'Unknown File',
          category: "Error",
          summary: `Processing failed: ${cvError.message}`,
          yearsOfExperience: 0,
          skills: [],
          jobTitle: "Unknown",
          professionalSummary: "Processing failed"
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