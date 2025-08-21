import OpenAI from 'openai';

// Initialize OpenAI client with proper error handling
let openai;
try {
  // Ensure API key is properly formatted
  const apiKey = process.env.OPENAI_API_KEY ? 
    process.env.OPENAI_API_KEY.replace(/^['"]|['"]$/g, '') : '';
  
  if (!apiKey) {
    console.warn("WARNING: OpenAI API key is not configured. AI analysis will be skipped.");
  } else {
    // Handle both v3 and v4 OpenAI SDK versions
    try {
      // Try V4 format first
      openai = new OpenAI({
        apiKey: apiKey,
      });
      console.log("OpenAI client initialized successfully with V4 SDK");
    } catch (v4Error) {
      // Fallback to V3 format if available
      console.warn("Failed to initialize with V4 SDK, trying V3 format:", v4Error.message);
      openai = new OpenAI(apiKey);
      console.log("OpenAI client initialized successfully with V3 SDK");
    }
  }
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
    2. Total years of job experience (as a number, return 0 if no experience found)
    3. Skills (as an array of strings)
    4. Current or most recent job title
    5. Brief professional summary (1-2 sentences)
    6. College or university name ONLY (just the institution name, not dates or degree details)
    7. Email address (if found)
    8. Phone number (if found)
    9. Name of the person (if found)
    10. Projects (as an array of objects with "name" and "description" fields, up to 3 projects)

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
        console.error("OpenAI client not properly initialized or missing 'chat' property");
        console.log("OpenAI object:", JSON.stringify(Object.keys(openai || {})));
        return getDefaultAnalysis("OpenAI client configuration error");
      }
      
      // Log OpenAI version information for debugging
      console.log("Attempting to use OpenAI version:", OpenAI.version || "unknown");
      
      // Determine which API format to use based on available methods
      let response;
      // Check if we have V4 format (chat.completions.create)
      if (openai.chat && typeof openai.chat.completions?.create === 'function') {
        console.log("Using OpenAI V4 API format");
        response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an AI assistant that analyzes resumes and CVs.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: 'json_object' }
        });
      } 
      // Check if we have V3 format (createChatCompletion)
      else if (typeof openai.createChatCompletion === 'function') {
        console.log("Using OpenAI V3 API format");
        response = await openai.createChatCompletion({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an AI assistant that analyzes resumes and CVs.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 800
        });
      } 
      // Fallback for other API versions
      else {
        console.log("Using legacy OpenAI API format");
        response = await openai.completions.create({
          model: 'text-davinci-003', // Fallback to older model
          prompt: `Analyze the following CV: ${limitedText.substring(0, 2000)}`,
          temperature: 0.3,
          max_tokens: 500
        });
      }
      
      console.log("Received response from OpenAI API");
      
      if (!response.choices || !response.choices[0]) {
        console.error("Invalid response structure from OpenAI:", response);
        return getDefaultAnalysis("Invalid API response structure");
      }
      
      // Handle different response structures based on API version
      let resultText;
      if (response.choices[0].message && response.choices[0].message.content) {
        // V4 format
        resultText = response.choices[0].message.content;
      } else if (response.choices[0].text) {
        // Legacy format
        resultText = response.choices[0].text;
      } else {
        console.error("Unable to extract content from API response:", response.choices[0]);
        return getDefaultAnalysis("Unable to extract content from API response");
      }
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

