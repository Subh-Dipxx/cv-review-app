import { NextResponse } from 'next/server';

// Fallback extraction function when OpenAI API fails
function getFallbackExtraction(text, fileName) {
  console.log('🔄 Using fallback extraction for:', fileName);
  
  // Basic text analysis
  const lines = text.toLowerCase().split('\n').filter(line => line.trim().length > 0);
  
  // Extract name (usually in first few lines)
  let name = 'Name Not Found';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && line.length < 50 && !line.includes('@') && !line.includes('http')) {
      // Skip lines with common CV keywords
      if (!line.includes('resume') && !line.includes('curriculum') && !line.includes('vitae') && 
          !line.includes('phone') && !line.includes('email') && !line.includes('address')) {
        name = line.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
        break;
      }
    }
  }
  
  // Extract email
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const email = emailMatch ? emailMatch[1] : 'Email Not Found';
  
  // Extract education with better degree name formatting
  let education = 'Education Not Found';
  const educationKeywords = [
    { pattern: /\b(bachelor|bs|ba|btech|be)\b/i, name: 'Bachelor\'s Degree' },
    { pattern: /\b(master|ms|ma|mtech|me|mba)\b/i, name: 'Master\'s Degree' },
    { pattern: /\b(phd|doctorate)\b/i, name: 'Doctorate/PhD' },
    { pattern: /\bjd\b/i, name: 'Juris Doctor (Law Degree)' },
    { pattern: /\b(md|mbbs)\b/i, name: 'Medical Degree' },
    { pattern: /\b(llb)\b/i, name: 'Bachelor of Law' },
    { pattern: /\buniversity\b/i, name: 'University Education' },
    { pattern: /\bcollege\b/i, name: 'College Education' }
  ];
  
  for (const { pattern, name } of educationKeywords) {
    const regex = new RegExp(`([^.]*${pattern.source}[^.]{0,50})`, 'i');
    const match = text.match(regex);
    if (match) {
      let found = match[1].trim();
      // Clean up and limit length
      found = found.replace(/[^\w\s.,&()-]/g, '').trim();
      if (found.length > 10 && found.length < 80) {
        // Use the formatted name if it's just the abbreviation
        const words = found.split(/\s+/);
        if (words.length === 1 && pattern.test(words[0])) {
          education = name;
        } else {
          education = found;
        }
        break;
      }
    }
  }
  
  // Extract role
  const roleKeywords = ['developer', 'engineer', 'manager', 'analyst', 'designer', 'consultant'];
  let role = 'Software Developer';
  for (const keyword of roleKeywords) {
    if (text.toLowerCase().includes(keyword)) {
      role = keyword.charAt(0).toUpperCase() + keyword.slice(1);
      break;
    }
  }
  
  // Extract skills
  const skillKeywords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'html', 'css', 'aws', 'docker'];
  const skills = skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill)
  ).map(skill => skill.toUpperCase()).slice(0, 8);
  
  if (skills.length === 0) {
    skills.push('JavaScript', 'HTML', 'CSS');
  }
  
  return NextResponse.json({
    name,
    email,
    education,
    role,
    skills,
    experience: 2,
    summary: `Professional analysis for ${fileName} using pattern-based extraction.`,
    recommendedRoles: [role, 'Software Engineer', 'Technical Specialist', 'Developer']
  });
}

export async function POST(request) {
  try {
    const { text, fileName } = await request.json();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Insufficient text provided' },
        { status: 400 }
      );
    }

    console.log('🤖 Processing AI extraction for:', fileName);
    console.log('📝 Text length:', text.length);

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ No OpenAI API key configured');
      throw new Error('OpenAI API key not configured');
    }

    // Use OpenAI API for intelligent extraction
    console.log('📡 Making OpenAI API request...');
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a CV/Resume parsing expert. Extract the following information from the CV text and return ONLY a valid JSON object with these exact keys:
- name: full name of the person (not job title)
- email: email address
- education: highest degree or education
- role: primary job role/title
- skills: array of technical skills (max 8)
- experience: years of experience (number)
- summary: brief professional summary (2-3 sentences)
- recommendedRoles: array of 3-4 suitable job roles

Return ONLY the JSON object, no other text or formatting.`
          },
          {
            role: 'user',
            content: `Please extract information from this CV:\n\n${text.substring(0, 2000)}`
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }),
    });

    console.log('📊 OpenAI Response Status:', openaiResponse.status);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('❌ OpenAI API error:', {
        status: openaiResponse.status,
        statusText: openaiResponse.statusText,
        error: errorText
      });
      
      // Provide specific error messages based on status code
      let errorMessage = 'OpenAI API request failed';
      if (openaiResponse.status === 401) {
        errorMessage = 'Invalid OpenAI API key - please check your API key configuration';
      } else if (openaiResponse.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded - please try again later';
      } else if (openaiResponse.status === 402) {
        errorMessage = 'OpenAI API quota exceeded - please check your billing';
      } else if (openaiResponse.status >= 500) {
        errorMessage = 'OpenAI service is temporarily unavailable';
      }
      
      throw new Error(`${errorMessage} (Status: ${openaiResponse.status})`);
    }

    const openaiData = await openaiResponse.json();
    const extractedContent = openaiData.choices[0]?.message?.content;

    if (!extractedContent) {
      throw new Error('No content from OpenAI');
    }

    // Parse the JSON response from OpenAI
    let parsedData;
    try {
      parsedData = JSON.parse(extractedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', extractedContent);
      throw new Error('Invalid JSON from OpenAI');
    }

    console.log('✅ AI extraction successful:', parsedData);

    // Validate and clean the data
    const result = {
      name: parsedData.name || 'Name Not Found',
      email: parsedData.email || 'Email Not Found',
      education: parsedData.education || 'Education Not Found',
      role: parsedData.role || 'Software Developer',
      skills: Array.isArray(parsedData.skills) ? parsedData.skills.slice(0, 8) : ['JavaScript', 'HTML', 'CSS'],
      experience: typeof parsedData.experience === 'number' ? parsedData.experience : 2,
      summary: parsedData.summary || `Professional summary for ${fileName}`,
      recommendedRoles: Array.isArray(parsedData.recommendedRoles) ? parsedData.recommendedRoles : ['Software Developer', 'Engineer']
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ AI extraction error:', error.message);
    
    // Use fallback extraction for any error
    console.log('🔄 Using fallback extraction due to error');
    return getFallbackExtraction(text, fileName);
  }
}
