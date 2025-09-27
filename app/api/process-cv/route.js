import { NextResponse } from "next/server";
import pool from "../../lib/db";
import { analyzeCvWithAI } from "../../lib/ai-service";
import { getAuth } from "@clerk/nextjs/server";

// Helper function to parse work history from CV text
function parseWorkHistory(text) {
  const workHistory = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  console.log('Starting work history parsing...');
  
  // Look for lines with date ranges throughout the document
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatches = extractDateRanges(line);
    
    if (dateMatches.length > 0) {
      console.log(`Found date line: "${line}"`);
      
      // Parse the date range
      const { startDate, endDate, duration } = parseDateRange(dateMatches[0]);
      
      if (duration > 0) {
        // Look for job title (usually 1-2 lines before the date)
        let jobTitle = 'Unknown Position';
        for (let j = Math.max(0, i - 3); j < i; j++) {
          const candidateLine = lines[j];
          if (candidateLine && candidateLine.length > 5 && candidateLine.length < 100 &&
              !extractDateRanges(candidateLine).length && // Not a date line
              !candidateLine.includes('@') && // Not an email
              !candidateLine.includes('+') && // Not a phone
              candidateLine.match(/[A-Za-z]/) && // Contains letters
              !candidateLine.toLowerCase().includes('experience') &&
              !candidateLine.toLowerCase().includes('education')) {
            jobTitle = candidateLine;
          }
        }
        
        // Look for company (usually 1-2 lines before or after the date)
        let company = 'Unknown Company';
        for (let j = Math.max(0, i - 2); j <= Math.min(lines.length - 1, i + 1); j++) {
          const candidateLine = lines[j];
          if (candidateLine && candidateLine !== line && candidateLine !== jobTitle &&
              candidateLine.length > 3 && candidateLine.length < 80 &&
              !extractDateRanges(candidateLine).length && // Not a date line
              !candidateLine.includes('@') && // Not an email
              !candidateLine.includes('+') && // Not a phone
              !candidateLine.startsWith('•') && // Not a bullet point
              candidateLine.match(/[A-Za-z]/)) { // Contains letters
            company = candidateLine;
            break;
          }
        }
        
        const job = {
          position: jobTitle,
          company: company,
          startDate,
          endDate,
          duration,
          rawText: line
        };
        
        workHistory.push(job);
        console.log(`Added job: ${jobTitle} at ${company} (${duration} months)`);
      }
    }
  }
  
  console.log(`Total jobs found: ${workHistory.length}`);
  return workHistory.filter(job => job.duration > 0);
}

// Find job title near a date line
function findJobTitle(lines, dateLineIndex) {
  const jobTitleKeywords = [
    'developer', 'engineer', 'manager', 'analyst', 'consultant', 'specialist',
    'coordinator', 'administrator', 'executive', 'director', 'lead', 'senior',
    'junior', 'intern', 'associate', 'assistant', 'supervisor', 'officer',
    'designer', 'architect', 'programmer', 'tester', 'qa', 'devops', 'scientist'
  ];
  
  // Search in nearby lines (typically job title is 1-3 lines before the date)
  for (let offset = -3; offset <= 1; offset++) {
    const index = dateLineIndex + offset;
    if (index >= 0 && index < lines.length) {
      const line = lines[index];
      const cleanLine = line.replace(/[•\-]/g, '').trim();
      
      // Check if line contains job title keywords and looks like a title
      if (jobTitleKeywords.some(keyword => cleanLine.toLowerCase().includes(keyword)) &&
          cleanLine.length > 5 && cleanLine.length < 80 &&
          !extractDateRanges(line).length && // Not a date line
          !isCompanyLine(line)) { // Not a company line
        return cleanLine;
      }
    }
  }
  
  return 'Unknown Position';
}

// Find company name near a date line
function findCompany(lines, dateLineIndex) {
  const companyIndicators = ['ltd', 'llc', 'inc', 'corp', 'company', 'technologies', 'systems', 'solutions', 'group'];
  
  // Search in nearby lines (company is usually 1-2 lines before or after the date)
  for (let offset = -2; offset <= 2; offset++) {
    const index = dateLineIndex + offset;
    if (index >= 0 && index < lines.length) {
      const line = lines[index];
      const cleanLine = line.replace(/[•\-]/g, '').trim();
      
      // Check if line looks like a company name
      if (isCompanyLine(cleanLine) || 
          companyIndicators.some(indicator => cleanLine.toLowerCase().includes(indicator))) {
        return cleanLine;
      }
    }
  }
  
  return 'Unknown Company';
}

// Helper function to detect company lines
function isCompanyLine(line) {
  const cleanLine = line.toLowerCase().trim();
  const companyIndicators = ['ltd', 'llc', 'inc', 'corp', 'company', 'technologies', 'systems', 'solutions', 'group'];
  
  // Company line indicators
  return companyIndicators.some(indicator => cleanLine.includes(indicator)) ||
    (line.length > 3 && line.length < 60 && 
     !line.includes('•') && 
     !extractDateRanges(line).length && // Not a date line
     !/^[a-z]/.test(line)); // Usually starts with capital letter
}

// Extract date ranges from text
function extractDateRanges(text) {
  const datePatterns = [
    // Month Year - Month Year
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*[-–—]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}/gi,
    // MM/YYYY - MM/YYYY
    /\d{1,2}\/\d{4}\s*[-–—]\s*\d{1,2}\/\d{4}/g,
    // YYYY - YYYY
    /\d{4}\s*[-–—]\s*\d{4}/g,
    // Month Year - Present/Current
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\s*[-–—]\s*(present|current|now)/gi,
    // YYYY - Present/Current
    /\d{4}\s*[-–—]\s*(present|current|now)/gi,
    // MM/YYYY - Present/Current
    /\d{1,2}\/\d{4}\s*[-–—]\s*(present|current|now)/gi
  ];
  
  const matches = [];
  datePatterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  });
  
  return matches;
}

// Parse a date range string into start date, end date, and duration
function parseDateRange(dateRange) {
  const currentDate = new Date();
  const parts = dateRange.split(/[-–—]/).map(part => part.trim());
  
  if (parts.length !== 2) {
    return { startDate: null, endDate: null, duration: 0 };
  }
  
  const startDate = parseDate(parts[0]);
  let endDate;
  
  if (parts[1].toLowerCase().includes('present') || 
      parts[1].toLowerCase().includes('current') ||
      parts[1].toLowerCase().includes('now')) {
    endDate = currentDate;
  } else {
    endDate = parseDate(parts[1]);
  }
  
  if (!startDate || !endDate) {
    return { startDate: null, endDate: null, duration: 0 };
  }
  
  // Calculate duration in months
  const duration = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)));
  
  return { startDate, endDate, duration };
}

// Parse various date formats
function parseDate(dateStr) {
  dateStr = dateStr.trim();
  
  // Month Year format (e.g., "Jan 2020", "January 2020")
  const monthYearMatch = dateStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{4})/i);
  if (monthYearMatch) {
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = monthNames.findIndex(m => monthYearMatch[1].toLowerCase().startsWith(m));
    return new Date(parseInt(monthYearMatch[2]), monthIndex, 1);
  }
  
  // MM/YYYY format
  const mmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    return new Date(parseInt(mmyyyyMatch[2]), parseInt(mmyyyyMatch[1]) - 1, 1);
  }
  
  // YYYY format
  const yyyyMatch = dateStr.match(/^(\d{4})$/);
  if (yyyyMatch) {
    return new Date(parseInt(yyyyMatch[1]), 0, 1);
  }
  
  return null;
}



// Calculate total years of experience from work history
function calculateTotalExperience(workHistory) {
  if (!workHistory || workHistory.length === 0) {
    return 0;
  }
  
  // Convert job periods to time intervals
  const periods = workHistory
    .filter(job => job.startDate && job.endDate && job.duration > 0)
    .map(job => ({
      start: job.startDate,
      end: job.endDate,
      months: job.duration
    }))
    .sort((a, b) => a.start - b.start);
  
  if (periods.length === 0) {
    return 0;
  }
  
  console.log('Calculating experience from periods:', periods.map(p => ({
    start: p.start.toISOString().substring(0, 10),
    end: p.end.toISOString().substring(0, 10),
    months: p.months
  })));
  
  // Merge overlapping periods
  const merged = [];
  let current = { ...periods[0] };
  
  for (let i = 1; i < periods.length; i++) {
    const next = periods[i];
    
    // If periods overlap or are adjacent, merge them
    if (next.start <= current.end) {
      current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
    } else {
      // No overlap, add current period and start a new one
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  
  // Calculate total months from merged periods
  const totalMonths = merged.reduce((total, period) => {
    const months = Math.max(1, Math.round((period.end - period.start) / (1000 * 60 * 60 * 24 * 30.44)));
    return total + months;
  }, 0);
  
  const years = Math.floor(totalMonths / 12);
  console.log(`Total experience: ${totalMonths} months = ${years} years`);
  
  return years;
}

export async function POST(request) {
  let connection;
  console.log("POST /api/process-cv - Request received");
  
  try {
    // Get the current user's ID from Clerk (might be null in keyless mode)
    const { userId } = getAuth(request);
    console.log('Current user ID in process-cv:', userId);
    
    // Use a default user ID for keyless mode
    const effectiveUserId = userId || 'keyless-user';
    console.log('Effective user ID:', effectiveUserId);
    
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

        // Extract years of experience by parsing work history
        let yearsOfExperience = 0;
        
        console.log('Parsing work history from CV text...');
        
        // Simple approach: find all date ranges in the document
        const allDateRanges = [];
        const lines = actualText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        lines.forEach((line, index) => {
          const dateMatches = extractDateRanges(line);
          if (dateMatches.length > 0) {
            const { startDate, endDate, duration } = parseDateRange(dateMatches[0]);
            if (duration > 0 && startDate && endDate) {
              allDateRanges.push({
                startDate,
                endDate,
                duration,
                rawText: line,
                lineIndex: index
              });
              console.log(`Found date range: ${line} (${duration} months)`);
            }
          }
        });
        
        if (allDateRanges.length > 0) {
          // Calculate total experience from all date ranges
          console.log(`Found ${allDateRanges.length} work periods`);
          
          // Sort by start date and merge overlapping periods
          const sortedRanges = allDateRanges.sort((a, b) => a.startDate - b.startDate);
          let totalMonths = 0;
          let lastEndDate = null;
          
          for (const range of sortedRanges) {
            let months = range.duration;
            
            // If this period starts before the last one ended, reduce overlap
            if (lastEndDate && range.startDate < lastEndDate) {
              const overlapMonths = Math.round((lastEndDate - range.startDate) / (1000 * 60 * 60 * 24 * 30.44));
              months = Math.max(0, months - overlapMonths);
              console.log(`Adjusted for overlap: ${range.duration} -> ${months} months`);
            }
            
            totalMonths += months;
            lastEndDate = new Date(Math.max(lastEndDate?.getTime() || 0, range.endDate.getTime()));
          }
          
          yearsOfExperience = Math.floor(totalMonths / 12);
          console.log(`Total experience calculated: ${totalMonths} months = ${yearsOfExperience} years`);
        }
        
        // Fallback: Try AI analysis if no date ranges found
        if (yearsOfExperience === 0) {
          try {
            console.log('No date ranges found, trying AI analysis...');
            const aiAnalysis = await analyzeCvWithAI(actualText);
            if (aiAnalysis && aiAnalysis.yearsOfExperience > 0) {
              yearsOfExperience = aiAnalysis.yearsOfExperience;
              console.log(`AI extracted ${yearsOfExperience} years of experience`);
            }
          } catch (aiError) {
            console.log('AI analysis also failed:', aiError.message);
          }
        }
        
        // Final fallback: Use simple regex patterns only if everything else failed
        if (yearsOfExperience === 0) {
          console.log('Trying regex fallback for explicit experience mentions...');
          const simplePatterns = [
            /(\d+)\+?\s*years?\s+of\s+experience/gi,
            /(\d+)\+?\s*years?\s+experience/gi,
            /experience\s*:?\s*(\d+)\+?\s*years?/gi
          ];
          
          for (const pattern of simplePatterns) {
            const matches = actualText.match(pattern);
            if (matches && matches.length > 0) {
              const numbers = matches[0].match(/\d+/g);
              if (numbers) {
                yearsOfExperience = parseInt(numbers[0]);
                console.log(`Regex fallback found ${yearsOfExperience} years from: "${matches[0].trim()}"`);
                break;
              }
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
        
        // Generate recommended roles based on actual extracted skills
        const recommendedRoles = [];
        
        if (skills.length > 0) {
          // Define role skill mappings based on actual skill matches
          const roleSkillsMap = {
            "Frontend Developer": ["React", "Angular", "Vue", "HTML", "CSS", "Javascript", "Typescript", "jQuery"],
            "Backend Developer": ["Node", "Express", "Django", "Flask", "Spring", "Java", "Python", "SQL", "Dotnet", "PHP", "Ruby", "C#"],
            "Full Stack Developer": ["React", "Angular", "Vue", "HTML", "CSS", "Javascript", "Typescript", "Node", "Express", "Python", "SQL"],
            "Data Engineer": ["Python", "SQL", "Pandas", "NumPy", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "BigQuery"],
            "Mobile Developer": ["React Native", "Flutter", "Swift", "Kotlin", "Java", "Android", "iOS"],
            "DevOps Engineer": ["Docker", "Kubernetes", "AWS", "Azure", "GCP", "Jenkins", "Git", "CI/CD", "Linux"],
            "Software Engineer": ["Java", "Python", "C++", "C#", "Javascript", "Git", "SQL"],
          };
          
          // Calculate role matches based on actual skills
          Object.entries(roleSkillsMap).forEach(([role, relevantSkills]) => {
            const matchedSkills = skills.filter(skill => 
              relevantSkills.some(relevantSkill => 
                skill.toLowerCase().includes(relevantSkill.toLowerCase()) ||
                relevantSkill.toLowerCase().includes(skill.toLowerCase())
              )
            );
            
            if (matchedSkills.length > 0) {
              // Calculate realistic percentage based on skill overlap
              const percent = Math.min(95, Math.round((matchedSkills.length / relevantSkills.length) * 100) + 10);
              recommendedRoles.push({ role, percent });
            }
          });
          
          // Sort by percentage match
          recommendedRoles.sort((a, b) => b.percent - a.percent);
          
          // Limit to top 3 matches
          recommendedRoles.splice(3);
        }
        
        // Only add fallback if no roles matched AND we have some skills
        if (recommendedRoles.length === 0 && skills.length > 0) {
          recommendedRoles.push({ role: "Software Developer", percent: 60 });
        } else if (recommendedRoles.length === 0) {
          // No skills detected, provide general role
          recommendedRoles.push({ role: "General Candidate", percent: 40 });
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
          
          // Find the CV record by filename and user_id
          const [cvRows] = await connection.query(
            'SELECT id FROM cvs WHERE file_name = ? AND user_id = ? ORDER BY id DESC LIMIT 1',
            [file.name, effectiveUserId]
          );
          
          if (cvRows.length > 0) {
            const cvId = cvRows[0].id;
            
            // Format the recommended roles for storage as JSON
            const formattedRoles = JSON.stringify(recommendedRoles);
            
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
                 recommended_roles = ?, 
                 user_id = ?
               WHERE id = ? AND user_id = ?`,
              [
                name || 'Unknown', 
                email || 'No email', 
                phoneNumber || 'No phone', 
                education || 'No education', 
                yearsOfExperience || 0, 
                category || 'No role',
                skills.join(', '),
                formattedRoles,
                effectiveUserId,
                cvId,
                effectiveUserId
              ]
            );
            
            console.log(`Updated CV ${cvId} with processed data including roles: ${formattedRoles}`);
          } else {
            // Create new CV record if it doesn't exist
            const formattedRoles = JSON.stringify(recommendedRoles);
            
            const [insertResult] = await connection.query(
              `INSERT INTO cvs (file_name, name, email, phone, professional_summary, years_of_experience, job_title, skills, recommended_roles, category, summary, user_id) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                file.name,
                name || 'Unknown', 
                email || 'No email', 
                phoneNumber || 'No phone', 
                education || 'No education', 
                yearsOfExperience || 0, 
                category || 'No role',
                skills.join(', '),
                formattedRoles,
                category,
                `CV analysis for ${file.name}`,
                effectiveUserId  // Use effective user ID (handles keyless mode)
              ]
            );
            
            console.log(`Created new CV ${insertResult.insertId} with processed data including roles: ${formattedRoles}`);
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
  