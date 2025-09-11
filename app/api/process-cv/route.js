import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { analyzeCvWithAI } from "../../lib/ai-service";

export async function POST(request) {
  let connection;
  console.log("POST /api/process-cv - Request received");
  
  try {
    // Parse FormData (for file uploads)
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    if (!files || files.length === 0) {
      return NextResponse.json({ 
        error: "No files provided" 
      }, { status: 400 });
    }

    // Process each CV file
    const categorized = [];
    
    for (const file of files) {
      try {
        console.log(`Processing CV: ${file.name}`);
        
        // Read file content
        const fileBuffer = await file.arrayBuffer();
        let actualText = "";
        
        if (file.type === 'application/pdf') {
          try {
            // Use the PDF parser
            const parsePdf = require('../../lib/pdf-parser');
            const buffer = Buffer.from(fileBuffer);
            const pdfData = await parsePdf(buffer);
            actualText = pdfData.text;
            console.log(`Extracted ${actualText.length} characters from PDF`);
          } catch (pdfError) {
            console.error('PDF parsing error:', pdfError);
            categorized.push({
              fileName: file.name,
              category: "Error", 
              summary: `PDF parsing failed: ${pdfError.message}`,
              error: "Failed to extract text from PDF file"
            });
            continue;
          }
        } else {
          // For text files, decode normally
          actualText = new TextDecoder().decode(fileBuffer);
        }
        
        // Skip if no text content
        if (!actualText || actualText.trim().length === 0) {
          categorized.push({
            fileName: file.name,
            category: "Error",
            summary: "Could not extract text from file - file appears to be empty",
          });
          continue;
        }

        // Basic CV analysis
        const text = actualText.toLowerCase();
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
        const textLines = actualText.split('\n');
        
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

        // Extract email - improved
        let email = "";
        const emailMatch = actualText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        if (emailMatch && emailMatch.length > 0) {
          email = emailMatch[0]; // Take the first valid email
        }

        // Extract phone number - improved patterns
        let phoneNumber = "";
        const phonePatterns = [
          /\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, // International format
          /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/g, // (123) 456-7890
          /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/g, // 123-456-7890
          /\+91[-.\s]?\d{5}[-.\s]?\d{5}/g, // Indian format
          /\d{10}/g // Simple 10 digits
        ];
        
        for (const pattern of phonePatterns) {
          const phoneMatches = actualText.match(pattern);
          if (phoneMatches && phoneMatches.length > 0) {
            phoneNumber = phoneMatches[0];
            break;
          }
        }

        // Extract college/university name - improved
        let collegeName = "Not specified";
        const collegePatterns = [
          /(?:university\s+of\s+)([a-zA-Z\s]+)/gi,
          /([a-zA-Z\s]+)\s+university/gi,
          /([a-zA-Z\s]+)\s+college/gi,
          /(?:college\s+of\s+)([a-zA-Z\s]+)/gi,
          /([a-zA-Z\s]+)\s+institute\s+of\s+technology/gi,
          /([a-zA-Z\s]+)\s+technical\s+university/gi,
          /([a-zA-Z\s]+)\s+school/gi,
          /bachelor.*from\s+([a-zA-Z\s]+)/gi,
          /master.*from\s+([a-zA-Z\s]+)/gi,
          /graduated\s+from\s+([a-zA-Z\s]+)/gi
        ];
        
        for (const pattern of collegePatterns) {
          const matches = actualText.match(pattern);
          if (matches && matches.length > 0) {
            // Extract the university/college name from the match
            let match = matches[0].replace(/university|college|institute|school|from|bachelor|master|graduated/gi, '').trim();
            if (match.length > 3 && match.length < 100) {
              collegeName = match;
              break;
            }
          }
        }

        // Also try to find education section and extract from there
        if (collegeName === "Not specified") {
          const educationIndex = textLines.findIndex(line => 
            line.toLowerCase().includes('education') || 
            line.toLowerCase().includes('academic') ||
            line.toLowerCase().includes('qualification')
          );
          
          if (educationIndex !== -1) {
            // Look in the next 5 lines after education header
            for (let i = educationIndex + 1; i < Math.min(educationIndex + 6, textLines.length); i++) {
              const line = textLines[i].trim();
              if (line.length > 10 && 
                  (line.toLowerCase().includes('university') || 
                   line.toLowerCase().includes('college') ||
                   line.toLowerCase().includes('institute'))) {
                collegeName = line;
                break;
              }
            }
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
          const matches = actualText.match(pattern);
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
  // Do NOT infer years of experience from graduation year. Only set if explicitly mentioned.

        // Extract skills
        const skillKeywords = ["javascript", "typescript", "python", "java", "c#", "php", "ruby", "sql", "html", "css", 
          "react", "angular", "vue", "node", "express", "django", "flask", "spring", "dotnet", "docker", "kubernetes",
          "aws", "azure", "gcp", "ci/cd", "git", "agile", "scrum", "test"];
          
        const skills = skillKeywords
          .filter(skill => text.includes(skill))
          .map(skill => skill.charAt(0).toUpperCase() + skill.slice(1));
          
        // Extract education - separated into school and college
        let school = "Not specified";
        let college = "Not specified";
        
        // School patterns - looking for "school" keyword
        const schoolPatterns = [
          /([a-zA-Z\s,.-]+(?:school|high\s+school|secondary\s+school|senior\s+secondary))/gi,
          /(?:studied\s+at|attended|from)\s+([a-zA-Z\s,.-]+school)/gi,
          /(?:class\s+x|class\s+xii|10th|12th).*(?:from|at)\s+([a-zA-Z\s,.-]+)/gi,
          /(?:icse|cbse|isc).*(?:from|at)\s+([a-zA-Z\s,.-]+)/gi
        ];
        
        // College patterns - looking for academy, university, college, institute
        const collegeEducationPatterns = [
          // Pattern: "Bachelor of Science in Computer Science from University of XYZ"
          /(?:bachelor|master|phd|doctorate).*(?:in|of)\s+([a-zA-Z\s]+)\s+(?:from|at)\s+([a-zA-Z\s,.-]+(?:academy|university|college|institute))/gi,
          // Pattern: "B.Tech in Computer Science, XYZ Academy"
          /(?:b\.?tech\.?|b\.?e\.?|m\.?tech\.?|m\.?e\.?)\s+(?:in\s+)?([a-zA-Z\s]+),?\s*([a-zA-Z\s,.-]+(?:academy|university|college|institute))/gi,
          // Pattern: "graduated from Academy/University"
          /(?:graduated\s+from|studied\s+at|attended)\s+([a-zA-Z\s,.-]+(?:academy|university|college|institute))/gi,
          // Pattern: "Bachelor degree from XYZ Academy"
          /(?:bachelor|master|phd|degree)\s+(?:degree\s+)?(?:from|at)\s+([a-zA-Z\s,.-]+(?:academy|university|college|institute))/gi,
          // Pattern: "XYZ Academy - Bachelor of Science"
          /([a-zA-Z\s,.-]+(?:academy|university|college|institute))\s*[-–—]\s*(?:bachelor|master|phd)/gi,
          // Simple pattern: any text followed by academy/university/college/institute
          /([a-zA-Z\s,.-]+(?:academy|university|college|institute))/gi
        ];
        
        // Extract school information
        for (const pattern of schoolPatterns) {
          const matches = [...actualText.matchAll(pattern)];
          if (matches && matches.length > 0) {
            const match = matches[0];
            const schoolName = match[1] ? match[1].trim() : match[0].trim();
            if (schoolName && schoolName.length > 3 && schoolName.length < 100) {
              school = schoolName;
              break;
            }
          }
        }
        
        // Extract college information
        for (const pattern of collegeEducationPatterns) {
          const matches = [...actualText.matchAll(pattern)];
          if (matches && matches.length > 0) {
            const match = matches[0];
            let collegeName = "";
            
            if (match[2]) {
              // Pattern that captured both degree and institution
              collegeName = match[2].trim();
            } else if (match[1]) {
              // Pattern that captured institution only
              collegeName = match[1].trim();
            }
            
            if (collegeName && collegeName.length > 3 && collegeName.length < 100) {
              college = collegeName;
              break;
            }
          }
        }
        
        // If still not found, look in education section
        const educationIndex = textLines.findIndex(line => 
          line.toLowerCase().includes('education') || 
          line.toLowerCase().includes('qualification') ||
          line.toLowerCase().includes('academic')
        );
        
        if (educationIndex !== -1) {
          // Look for school and college info in next few lines
          for (let i = educationIndex + 1; i < Math.min(educationIndex + 8, textLines.length); i++) {
            const line = textLines[i].trim();
            
            // Check for school
            if (school === "Not specified" && line.toLowerCase().includes('school')) {
              if (line.length > 5 && line.length < 100) {
                school = line;
              }
            }
            
            // Check for college/academy
            if (college === "Not specified" && 
                (line.toLowerCase().includes('academy') || 
                 line.toLowerCase().includes('university') ||
                 line.toLowerCase().includes('college') ||
                 line.toLowerCase().includes('institute'))) {
              if (line.length > 5 && line.length < 100) {
                college = line;
              }
            }
          }
        }
        
        // Create education string - prioritize school name without labels
        let education = "Not specified";
        if (school !== "Not specified") {
          education = school;
        } else if (college !== "Not specified") {
          education = college;
        }
        
        // Generate sample recommended roles with match percentages
        const roleSkillsMap = {
          "Frontend Developer": ["React", "Angular", "Vue", "HTML", "CSS", "Javascript", "Typescript"],
          "Backend Developer": ["Node", "Express", "Django", "Flask", "Spring", "Java", "Python", "SQL", "Dotnet", "PHP", "Ruby"],
          "Full Stack Developer": ["React", "Angular", "Vue", "HTML", "CSS", "Javascript", "Typescript", "Node", "Express", "Django", "Flask", "Spring", "Java", "Python", "SQL", "MongoDB", "PostgreSQL"],
          "Data Engineer": ["Python", "SQL", "Docker", "Kubernetes", "AWS", "Azure", "GCP"],
          "Project Manager": ["Agile", "Scrum", "Git", "CI/CD"],
        };
        const recommendedRoles = [];
        Object.entries(roleSkillsMap).forEach(([role, relevantSkills]) => {
          const matchedSkills = skills.filter(skill => relevantSkills.includes(skill));
          if (matchedSkills.length > 0) {
            // Calculate percentage match
            const percent = Math.round((matchedSkills.length / relevantSkills.length) * 100);
            recommendedRoles.push({ role, percent });
          }
        });
        if (recommendedRoles.length === 0) {
          recommendedRoles.push({ role: "General Developer", percent: 50 });
        }

        // Create comprehensive summary with all requested fields
        let detailedSummary = {
          name: name,
          email: email,
          contact: phoneNumber,
          education: education,
          school: school,
          college: college,
          recommendedRoles: recommendedRoles,
          shortSummary: ""
        };
        
        // Create short summary from actual extracted information
        let shortSummary = "";
        if (category !== "Other") {
          shortSummary = `${category}`;
          if (yearsOfExperience > 0) {
            shortSummary += ` with ${yearsOfExperience}+ years of experience`;
          }
          shortSummary += ". ";
        }
        
        if (skills.length > 0) {
          shortSummary += `Skilled in ${skills.slice(0, 3).join(', ')}${skills.length > 3 ? ' and more' : ''}. `;
        }
        
        if (collegeName !== "Not specified") {
          shortSummary += `Educated at ${collegeName}. `;
        }
        
        // If we couldn't build a good summary, extract from meaningful text lines
        if (!shortSummary || shortSummary.trim().length < 20) {
          const meaningfulLines = actualText
            .split("\n")
            .map(line => line.trim())
            .filter(line => 
              line.length > 15 && 
              !line.toLowerCase().includes('resume') &&
              !line.toLowerCase().includes('curriculum vitae') &&
              !line.includes('@') &&
              !/^\d+$/.test(line) // Skip lines with just numbers
            )
            .slice(0, 2);
          
          shortSummary = meaningfulLines.join(" ").substring(0, 200);
          if (shortSummary.length > 10) {
            shortSummary += "...";
          }
        }
        
        // Final fallback
        if (!shortSummary || shortSummary.trim().length < 10) {
          shortSummary = `${category} candidate with relevant skills and experience.`;
        }
        
        detailedSummary.shortSummary = shortSummary;

        // Add processed CV to results
        const processedCV = {
          fileName: file.name,
          name: name,
          email: email,
          phoneNumber: phoneNumber,
          contact: phoneNumber,
          collegeName: collegeName,
          category,
          summary: detailedSummary,
          skills,
          education,
          recommendedRoles,
          yearsOfExperience: yearsOfExperience,
          role: category // Add role field for frontend filter
        };
        
        console.log('🔍 DEBUG: Processed CV structure:', JSON.stringify(processedCV, null, 2));
        categorized.push(processedCV);
        
        // Save the extracted data to the database
        try {
          const pool = require('../../lib/db').default;
          const connection = await pool.getConnection();
          
          // Find the CV record by filename and user_id (assuming user_id is available in context)
          const [cvRows] = await connection.query(
            'SELECT id FROM cvs WHERE file_name = ? ORDER BY id DESC LIMIT 1',
            [cv.fileName]
          );
          
          if (cvRows.length > 0) {
            const cvId = cvRows[0].id;
            
            // Format the recommended roles for storage
            const formattedRoles = recommendedRoles.map(r => 
              typeof r === 'object' ? r.role : r
            ).join(', ');
            
            // Update the CV record with the processed data
            await connection.query(
              `UPDATE cvs SET 
                 name = ?, 
                 email = ?, 
                 phone = ?, 
                 professional_summary = ?, 
                 years_of_experience = ?, 
                 job_title = ?, 
                 skills = ?, 
                 recommended_roles = ? 
               WHERE id = ?`,
              [
                name || 'Unknown', 
                email || 'No email', 
                phoneNumber || 'No phone', 
                education || 'No education', 
                yearsOfExperience || 0, 
                category || 'No role',
                skills.join(', '),
                formattedRoles,
                cvId
              ]
            );
            
            console.log(`Updated CV ${cvId} with processed data including roles: ${formattedRoles}`);
          }
          
          connection.release();
        } catch (dbError) {
          console.error(`Error saving processed data for ${file.name}:`, dbError.message);
        }
        
      } catch (cvError) {
        console.error(`Error processing CV ${file.name}:`, cvError.message);
        categorized.push({
          fileName: file.name,
          category: "Error",
          summary: "Failed to process CV: " + cvError.message
        });
      }
    }

    return NextResponse.json({ results: categorized });
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
  