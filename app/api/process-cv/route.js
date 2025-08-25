import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { analyzeCvWithAI } from "../../lib/ai-service";

export async function POST(request) {
  let connection;
  console.log("POST /api/process-cv - Request received");
  
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

    // Process each CV without requiring database
    const categorized = [];
    
    for (const cv of results) {
      try {
        console.log(`Processing CV: ${cv.fileName}`);
        // Skip invalid data
        if (!cv || typeof cv.fileName !== "string" || typeof cv.text !== "string" || cv.text.trim().length === 0) {
          categorized.push({
            fileName: cv.fileName || "Unknown",
            category: "Error",
            summary: "Invalid CV data",
          });
          continue;
        }

        // Basic CV analysis (without AI)
        const text = cv.text.toLowerCase();
        let category = "Other";
        
        // Simple rule-based categorization
        if (text.includes("qa") || text.includes("quality assurance") || text.includes("testing") || text.includes("selenium")) {
          category = "QA Engineer";
        } else if (text.includes("business analyst") || text.includes("requirements") || text.includes("stakeholder")) {
          category = "Business Analyst";
        } else if (text.includes("frontend") || text.includes("react") || text.includes("angular") || text.includes("vue")) {
          category = "Frontend Developer";
        } else if (text.includes("backend") || text.includes("node") || text.includes("java") || text.includes("spring")) {
          category = "Backend Developer";
        } else if (text.includes("fullstack") || text.includes("full stack") || text.includes("full-stack")) {
          category = "Fullstack Developer";
        } else if (text.includes("data scientist") || text.includes("machine learning") || text.includes("ai ") || text.includes("artificial intelligence")) {
          category = "Data Scientist";
        }

        // Extract name from CV
        let name = "Not specified";
        const textLines = cv.text.split('\n');
        
        // Try to find name from first few lines (usually at the top)
        for (let i = 0; i < Math.min(5, textLines.length); i++) {
          const line = textLines[i].trim();
          if (line.length > 2 && line.length < 50 && 
              /^[A-Z][a-zA-Z\s\.]+$/.test(line) && 
              !line.toLowerCase().includes('resume') && 
              !line.toLowerCase().includes('cv') &&
              !line.toLowerCase().includes('curriculum') &&
              !line.toLowerCase().includes('email') &&
              !line.toLowerCase().includes('phone') &&
              !line.includes('@')) {
            name = line;
            break;
          }
        }

        // Extract email
        let email = "";
        const emailMatch = cv.text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) {
          email = emailMatch[0];
        }

        // Extract phone number (improved to avoid email conflicts)
        let phoneNumber = "";
        const phonePatterns = [
          /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
          /(?:\+91|91)?[-.\s]?\d{5}[-.\s]?\d{5}\b/g,
          /(?:\+?\d{1,3}[-.\s]?)?\d{10}\b/g
        ];
        
        for (const line of textLines) {
          // Skip lines that contain @ symbol (likely email lines)
          if (line.includes('@')) continue;
          
          for (const pattern of phonePatterns) {
            const phoneMatches = line.match(pattern);
            if (phoneMatches && phoneMatches.length > 0) {
              const phone = phoneMatches[0].trim();
              // Additional check to ensure it's not an email or other data
              if (!phone.includes('@') && !phone.includes('.com') && !phone.includes('.in')) {
                phoneNumber = phone;
                break;
              }
            }
          }
          if (phoneNumber) break;
        }

        // Extract college/university name
        let collegeName = "Not specified";
        const collegePatterns = [
          /university\s+of\s+[a-zA-Z\s]+/gi,
          /[a-zA-Z\s]+\s+university/gi,
          /[a-zA-Z\s]+\s+college/gi,
          /college\s+of\s+[a-zA-Z\s]+/gi,
          /[a-zA-Z\s]+\s+institute\s+of\s+technology/gi,
          /[a-zA-Z\s]+\s+technical\s+university/gi
        ];
        
        for (const pattern of collegePatterns) {
          const matches = cv.text.match(pattern);
          if (matches && matches.length > 0) {
            collegeName = matches[0].trim();
            break;
          }
        }

        // Extract years of experience
        let yearsOfExperience = 0;
        const experiencePatterns = [
          /(\d+)\+?\s*years?\s+of\s+experience/gi,
          /(\d+)\+?\s*years?\s+experience/gi,
          /experience\s*:?\s*(\d+)\+?\s*years?/gi,
          /(\d+)\+?\s*years?\s+in/gi,
          /(\d+)\+?\s*yr?s?\s+exp/gi
        ];
        
        for (const pattern of experiencePatterns) {
          const matches = cv.text.match(pattern);
          if (matches && matches.length > 0) {
            const match = matches[0];
            const numbers = match.match(/\d+/);
            if (numbers) {
              yearsOfExperience = parseInt(numbers[0]);
              break;
            }
          }
        }
        
        // If no specific experience found, try to infer from graduation year
        if (yearsOfExperience === 0) {
          const currentYear = new Date().getFullYear();
          const yearMatches = cv.text.match(/20\d{2}/g);
          if (yearMatches && yearMatches.length > 0) {
            const years = yearMatches.map(y => parseInt(y)).sort((a, b) => b - a);
            // Assume earliest year might be graduation year
            const earliestYear = Math.min(...years);
            if (earliestYear >= 2010 && earliestYear <= currentYear - 1) {
              yearsOfExperience = Math.max(0, currentYear - earliestYear - 1);
            }
          }
        }

        // Extract skills
        const skillKeywords = ["javascript", "typescript", "python", "java", "c#", "php", "ruby", "sql", "html", "css", 
          "react", "angular", "vue", "node", "express", "django", "flask", "spring", "dotnet", "docker", "kubernetes",
          "aws", "azure", "gcp", "ci/cd", "git", "agile", "scrum", "test"];
          
        const skills = skillKeywords
          .filter(skill => text.includes(skill))
          .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
          
        // Extract education
        let education = "Not specified";
        if (text.includes("university") || text.includes("college") || text.includes("bachelor") || 
            text.includes("master") || text.includes("phd") || text.includes("degree")) {
          
          const eduLines = cv.text.split("\n")
            .filter(line => /university|college|bachelor|master|phd|degree/i.test(line))
            .slice(0, 1);
            
          if (eduLines.length > 0) {
            education = eduLines[0].trim();
          }
        }
        
        // Generate sample recommended roles with match percentages
        const recommendedRoles = [];
        if (skills.includes("React") || skills.includes("Angular") || skills.includes("Vue")) {
          recommendedRoles.push("Frontend Developer");
        }
        if (skills.includes("Node") || skills.includes("Express") || skills.includes("Django")) {
          recommendedRoles.push("Backend Developer");
        }
        if (skills.includes("Python") || skills.includes("SQL")) {
          recommendedRoles.push("Data Engineer");
        }
        if (skills.includes("Agile") || skills.includes("Scrum")) {
          recommendedRoles.push("Project Manager");
        }
        if (recommendedRoles.length === 0) {
          recommendedRoles.push("General Developer");
        }

        // Create summary
        const summary = text
          .split("\n")
          .filter((line) => line.trim().length > 10)
          .slice(0, 3)
          .join(" ")
          .substring(0, 150) + "...";

        // Add processed CV to results
        categorized.push({
          fileName: cv.fileName,
          name: name,
          email: email,
          phoneNumber: phoneNumber,
          collegeName: collegeName,
          category,
          summary,
          skills,
          education,
          recommendedRoles,
          yearsOfExperience: yearsOfExperience,
          role: category // Add role field for frontend filter
        });
        
      } catch (cvError) {
        console.error(`Error processing CV ${cv.fileName}:`, cvError.message);
        categorized.push({
          fileName: cv.fileName,
          category: "Error",
          summary: "Failed to process CV: " + cvError.message
        });
      }
    }

    return NextResponse.json({ categorized });
  } catch (error) {
    console.error("Error in process-cv API:", error);
    return NextResponse.json(
      { error: `Failed to process CVs: ${error.message}` },
      { status: 500 }
    );
  } finally {
    // Release connection if one was acquired
    if (connection) {
      connection.release();
    }
  }
}
  