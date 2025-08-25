import { NextResponse } from 'next/server';

// Fallback extraction function when OpenAI API fails
function getFallbackExtraction(text, fileName, educationOnly = false) {
  console.log(`🔄 Using fallback extraction for: ${fileName}${educationOnly ? ' (Education Only)' : ''}`);
  
  // Basic text analysis
  const lines = text.toLowerCase().split('\n').filter(line => line.trim().length > 0);
  
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
      found = found.replace(/[^\w\s.,&()-]/g, '').trim();
      if (found.length > 10 && found.length < 80) {
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

  if (educationOnly) {
    return education;
  }

  // Extract name (usually in first few lines)
  let name = 'Name Not Found';
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && line.length < 50 && !line.includes('@') && !line.includes('http')) {
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

  // Improved experience extraction: only match work experience phrases
  let experience = 0;
  const expPatterns = [
    /(\d{1,2})\s*\+?\s*(years|yrs)\s+(of\s+)?(work|working|experience|industry)/i,
    /(over|more than)\s*(\d{1,2})\s*(years|yrs)\s+(of\s+)?(work|working|experience|industry)/i
  ];
  let expMatch = expPatterns[0].exec(text);
  let overMatch = expPatterns[1].exec(text);
  if (expMatch) {
    experience = parseInt(expMatch[1], 10);
  } else if (overMatch) {
    experience = parseInt(overMatch[2], 10);
  }
  // Always default to 0 if not matched
  if (!experience || isNaN(experience)) experience = 0;

  return {
    name,
    email,
    education,
    role,
    skills,
    experience,
    summary: `Professional analysis for ${fileName} using pattern-based extraction.`,
    recommendedRoles: [role, 'Software Engineer', 'Technical Specialist', 'Developer']
  };
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

    // Use only hardcoded extraction
    const extracted = getFallbackExtraction(text, fileName);
    return NextResponse.json(extracted);

  } catch (error) {
    console.error('❌ Extraction error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
