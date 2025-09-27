import OpenAI from 'openai';

// Initialize OpenAI client with proper error handling
let openai;
try {
  // Strip quotes if they exist in the API key
  const apiKey = process.env.OPENAI_API_KEY ? 
    process.env.OPENAI_API_KEY.replace(/^['"]|['"]$/g, '') : '';
  
  openai = new OpenAI({
    apiKey: apiKey,
  });
  console.log("OpenAI client initialized successfully");
} catch (error) {
  console.error("Failed to initialize OpenAI client:", error);
  openai = null;
}

/**
 * Analyze CV text using AI to extract key information
 * @param {string} cvText - The text content of the CV
 * @returns {Promise<Object>} - Analysis results
 */
export async function analyzeCvWithAI(cvText) {
  try {
    console.log("Starting AI analysis of CV text...");
    
    // Handle empty or invalid text
    if (!cvText || typeof cvText !== 'string' || cvText.trim().length < 50) {
      console.warn("CV text too short or invalid for AI analysis");
      return getDefaultAnalysis("CV text too short for analysis");
    }
    
    // Prepare the prompt with limited text to avoid token limits
    const limitedText = cvText.substring(0, 3000);
    console.log(`Prepared CV text for analysis (${limitedText.length} chars)`);
    
    const prompt = `
    Analyze the following CV/resume text and extract this information in JSON format:
    1. Most appropriate job category (choose exactly one): "Software Developer", "QA Engineer", "BA Engineer", "Project Manager", "Data Analyst", "Designer", "DevOps Engineer", or "Other"
    2. Total years of PROFESSIONAL WORK experience (calculate from employment history and job dates. Look for work periods like "Jan 2020 - Dec 2022", "2019 - Present", "6 months at Company X". Add up all employment periods, handle overlaps. Return 0 if no work history found.)
    3. Skills (as an array of strings)
    4. Current or most recent job title
    5. Brief professional summary (1-2 sentences)
    6. College or university name ONLY (just the institution name, not dates or degree details)
    7. Email address (if found)
    8. Phone number (if found)
    9. Name of the person (if found)
    10. Projects (as an array of objects with "name" and "description" fields, up to 3 projects)

    IMPORTANT: For years of experience, look specifically for:
    - "X years of experience"
    - "X+ years working"
    - "Over X years"
    - "X years in [industry/role]"
    - Employment history spans (calculate from start to end dates)
    
    Do NOT count:
    - Years since graduation
    - Course duration
    - Age
    - Internship duration (unless explicitly mentioned as work experience)

    CV TEXT:
    ${limitedText}

    Return ONLY a valid JSON object with these fields:
    {
      "category": string,
      "yearsOfExperience": number,
      "skills": string[],
      "jobTitle": string,
      "professionalSummary": string,
      "collegeName": string,
      "email": string,
      "phone": string,
      "name": string,
      "projects": [{ "name": string, "description": string }]
    }

    For the collegeName, return ONLY the educational institution name, not any other details.
    For projects, make sure these are actual projects, not education entries.
    `;

    console.log("Sending request to OpenAI API...");
    
    try {
      // Check if OpenAI client is properly initialized
      if (!openai || !openai.chat) {
        console.error("OpenAI client not properly initialized");
        return getDefaultAnalysis("OpenAI client configuration error");
      }
      
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an AI assistant that analyzes resumes and CVs.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 800,
        response_format: { type: 'json_object' }
      });
      
      console.log("Received response from OpenAI API");
      
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        console.error("Invalid response structure from OpenAI:", response);
        return getDefaultAnalysis("Invalid API response structure");
      }
      
      const resultText = response.choices[0].message.content;
      console.log("AI response content:", resultText);
      
      // Parse JSON response safely
      let result;
      try {
        result = JSON.parse(resultText);
      } catch (jsonError) {
        console.error("Failed to parse AI response as JSON:", jsonError);
        return getDefaultAnalysis("Failed to parse AI response");
      }
      
      // Validate and return structured data
      console.log("Successfully analyzed CV with AI");
      return {
        category: result.category || "Other",
        yearsOfExperience: Number(result.yearsOfExperience) || 0,
        skills: Array.isArray(result.skills) ? result.skills : [],
        jobTitle: result.jobTitle || "Not specified",
        professionalSummary: result.professionalSummary || "No summary available.",
        collegeName: result.collegeName || "",
        email: result.email || "",
        phone: result.phone || "",
        name: result.name || "",
        projects: Array.isArray(result.projects) ? result.projects : []
      };
    } catch (apiError) {
      console.error("OpenAI API error:", apiError);
      console.error("Error details:", {
        message: apiError.message,
        status: apiError.status || apiError.statusCode,
        type: apiError.type
      });
      return getDefaultAnalysis(`OpenAI API error: ${apiError.message}`);
    }
    
  } catch (error) {
    console.error("Unexpected error in AI analysis:", error);
    return getDefaultAnalysis(`Unexpected error: ${error.message}`);
  }
}

// Helper function to get default analysis values
function getDefaultAnalysis(errorReason) {
  console.log(`Using default analysis due to: ${errorReason}`);
  // Return empty values that will be filled by the fallback analysis in process-cv
  return {
    category: "",  // Will be determined by fallback analysis
    yearsOfExperience: 0,
    skills: [],
    jobTitle: "",
    professionalSummary: "", // Will be populated with actual content by fallback
    collegeName: "",
    email: "",
    phone: "",
    name: "",
    projects: []
  };
}

