import { NextResponse } from "next/server";
import OpenAI from "openai";
import pool from "../../lib/db";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { text, fileName, cvId } = await request.json();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient text provided' },
        { status: 400 }
      );
    }

    const prompt = `
      Analyze the following resume text and extract the information into a structured JSON object.
      The JSON object must have the following keys: "name", "email", "phone", "education", "yearsOfExperience", "role", "skills", "summary", "recommendedRoles".

      - "name": The full name of the candidate. Default to "Not Found" if missing.
      - "email": The candidate's email address. Default to "Not Found" if missing.
      - "phone": The candidate's phone number. Default to "Not Found" if missing.
      - "education": A brief summary of their highest education (e.g., "Bachelor of Science in Computer Science"). Default to "Not specified" if missing.
      - "yearsOfExperience": The total years of professional experience as a number. Default to 0 if not found.
      - "role": The most recent or primary job title (e.g., "Senior Software Engineer"). Default to "Not specified" if missing.
      - "skills": A JSON array of the top 5-7 most relevant technical skills (e.g., ["React", "Node.js", "Python"]). Default to an empty array if none are found.
      - "summary": A concise 2-3 sentence professional summary of the candidate. Default to "No summary available." if missing.
      - "recommendedRoles": A JSON array of 3-4 suitable job titles based on the resume (e.g., ["Frontend Developer", "UI Engineer"]). Default to an empty array if none are found.

      Resume Text:
      ---
      ${text.substring(0, 8000)}
      ---
    `;

      const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    console.log('OpenAI response received:', response.choices[0].message.content);
    
    let extractedData;
    try {
      extractedData = JSON.parse(response.choices[0].message.content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // Provide default values if parsing fails
      extractedData = {
        name: "Parse Error",
        email: "Not available",
        phone: "Not available",
        education: "Not available",
        yearsOfExperience: 0,
        role: "Not specified",
        skills: ["Error parsing skills"],
        summary: "There was an error parsing the resume data. Please try again.",
        recommendedRoles: ["Not available"]
      };
    }    const { name, email, phone, education, yearsOfExperience, role, skills, summary, recommendedRoles } = extractedData;

    console.log('Processing extracted data for CV ID:', cvId);
    console.log('Summary:', summary);
    
    // Ensure all data is properly formatted to prevent SQL errors
    const connection = await pool.getConnection();
    
    // Format arrays properly
    const formattedSkills = Array.isArray(skills) ? skills.join(', ') : 'No skills';
    const formattedRoles = Array.isArray(recommendedRoles) ? recommendedRoles.join(', ') : 'No roles';
    
    try {
      await connection.query(
        `UPDATE cvs SET 
           name = ?, 
           email = ?, 
           phone = ?, 
           professional_summary = ?, 
           years_of_experience = ?, 
           job_title = ?, 
           skills = ?, 
           summary = ?, 
           recommended_roles = ? 
         WHERE id = ?`,
        [
          name || 'Unknown', 
          email || 'No email', 
          phone || 'No phone', 
          education || 'No education', 
          yearsOfExperience || 0, 
          role || 'No role',
          formattedSkills,
          summary || `Resume analysis for ${fileName || 'unknown file'}`,
          formattedRoles,
          cvId
        ]
      );
      console.log('Database updated successfully for CV ID:', cvId);
    } catch (dbError) {
      console.error('Database update error:', dbError);
      throw new Error(`Database update failed: ${dbError.message}`);
    } finally {
      connection.release();
    }

    return NextResponse.json({ ...extractedData, cvId });

  } catch (error) {
    console.error('❌ Extraction error:', error.message);
    return NextResponse.json({ error: `AI extraction failed: ${error.message}` }, { status: 500 });
  }
}
