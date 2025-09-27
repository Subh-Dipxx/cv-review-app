// Test CV content with realistic work history patterns
const testCV = `
John Doe
Software Engineer
john.doe@email.com
+1-555-123-4567

WORK EXPERIENCE

Senior Software Engineer
TechCorp Inc.
May 2018 - Present
• Led development of microservices architecture
• Managed team of 5 developers
• Improved system performance by 40%

Software Engineer
StartupXYZ
Jan 2015 - Apr 2018
• Developed full-stack web applications
• Worked with React, Node.js, and MongoDB
• Collaborated with cross-functional teams

Junior Developer
CodeWorks Ltd
Jun 2013 - Dec 2014
• Built responsive web interfaces
• Learned modern development practices
• Contributed to multiple client projects

EDUCATION
Bachelor of Computer Science
State University
2009 - 2013
`;

// Copy the parsing functions to test them
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
  const duration = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30.44)));
  
  return { startDate, endDate, duration };
}

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

console.log('=== TESTING CURRENT DATE PARSING ===');
const testLines = [
  'May 2018 - Present',
  'Jan 2015 - Apr 2018', 
  'Jun 2013 - Dec 2014'
];

testLines.forEach(line => {
  console.log(`\nTesting: "${line}"`);
  const dates = extractDateRanges(line);
  console.log(`Found dates: ${JSON.stringify(dates)}`);
  
  if (dates.length > 0) {
    const parsed = parseDateRange(dates[0]);
    console.log(`Start: ${parsed.startDate}`);
    console.log(`End: ${parsed.endDate}`);
    console.log(`Duration: ${parsed.duration} months`);
  }
});

console.log('\n=== EXPECTED vs ACTUAL ===');
console.log('Expected:');
console.log('1. May 2018 - Present = ~89 months (7+ years)');  
console.log('2. Jan 2015 - Apr 2018 = ~39 months (3+ years)');
console.log('3. Jun 2013 - Dec 2014 = ~18 months (1.5 years)');
console.log('Total experience should be ~10-11 years');