'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Dynamic import of PDF.js with comprehensive error handling
let pdfjsLib = null;
let isLoadingPdfjs = false;
let pdfLoadError = null;

const loadPdfjs = async () => {
  if (pdfjsLib) return pdfjsLib;
  if (isLoadingPdfjs) {
    // Wait for existing load to complete
    while (isLoadingPdfjs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return pdfjsLib;
  }
  
  isLoadingPdfjs = true;
  try {
    console.log('📦 Loading PDF.js library...');
    const pdfjs = await import('pdfjs-dist');
    pdfjsLib = pdfjs;
    
    // Configure worker with multiple fallbacks
    const workerUrls = [
      `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`,
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
      '/pdf.worker.min.js' // Local fallback
    ];
    
    let workerConfigured = false;
    for (const workerUrl of workerUrls) {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        console.log('✅ PDF.js worker configured:', workerUrl);
        workerConfigured = true;
        break;
      } catch (workerError) {
        console.warn('⚠️ Failed to configure worker:', workerUrl, workerError.message);
      }
    }
    
    if (!workerConfigured) {
      console.warn('⚠️ All worker URLs failed, disabling worker (will use main thread)');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    }
    
    console.log('🎉 PDF.js loaded successfully');
    return pdfjsLib;
    
  } catch (error) {
    console.error('❌ Failed to load PDF.js:', error);
    pdfLoadError = error;
    throw new Error(`PDF processing library failed to load: ${error.message}`);
  } finally {
    isLoadingPdfjs = false;
  }
};

// Initialize PDF.js if in browser
if (typeof window !== 'undefined') {
  loadPdfjs().catch(err => {
    console.error('PDF.js initialization failed:', err);
    pdfLoadError = err;
  });
}

export default function CVUploadPage() {
  const { user, loading } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processedCVs, setProcessedCVs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Enhanced file validation
  const validateFile = (file) => {
    console.log('🔍 Validating file:', file.name, 'Type:', file.type, 'Size:', file.size);
    
    // Check file type
    if (file.type !== 'application/pdf') {
      toast.error(`${file.name} is not a PDF file (detected type: ${file.type})`);
      return false;
    }
    
    // Check file size
    if (file.size === 0) {
      toast.error(`${file.name} is empty`);
      return false;
    }
    
    if (file.size > 10 * 1024 * 1024) { // Increased to 10MB
      toast.error(`${file.name} is too large (max 10MB, current: ${formatFileSize(file.size)})`);
      return false;
    }
    
    // Basic filename validation
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error(`${file.name} does not have a .pdf extension`);
      return false;
    }
    
    console.log('✅ File validation passed for:', file.name);
    return true;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file upload
  const handleFileUpload = (files) => {
    if (uploadedFiles.length + files.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }

    setUploading(true);
    const validFiles = [];

    Array.from(files).forEach((file) => {
      if (validateFile(file)) {
        const fileData = {
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          file: file
        };
        validFiles.push(fileData);
      }
    });

    setUploadedFiles(prev => [...prev, ...validFiles]);
    setUploading(false);
    
    if (validFiles.length > 0) {
      toast.success(`${validFiles.length} file(s) uploaded successfully`);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  // Advanced PDF Text Extraction with comprehensive error handling
  const extractTextFromPDF = async (file) => {
    try {
      console.log('🔍 Starting PDF extraction for:', file.name);
      console.log('📊 File size:', file.size, 'bytes');
      
      // Ensure PDF.js is loaded
      if (pdfLoadError) {
        throw new Error(`PDF library failed to load: ${pdfLoadError.message}`);
      }
      
      if (!pdfjsLib) {
        console.log('📦 Loading PDF.js library...');
        pdfjsLib = await loadPdfjs();
      }
      
      // Check file size
      if (file.size === 0) {
        throw new Error('PDF file is empty');
      }
      
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('PDF file too large (max 50MB)');
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('📦 ArrayBuffer created, size:', arrayBuffer.byteLength);
      
      // Validate arrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Failed to read PDF file content');
      }
      
      // Try different PDF.js configurations
      let pdf;
      const configs = [
        {
          name: 'Standard',
          config: { 
            data: arrayBuffer,
            verbosity: 0,
            disableFontFace: true,
            useSystemFonts: true
          }
        },
        {
          name: 'Basic',
          config: { 
            data: arrayBuffer,
            verbosity: 0
          }
        },
        {
          name: 'Minimal',
          config: arrayBuffer
        }
      ];
      
      for (const { name, config } of configs) {
        try {
          console.log(`🔄 Attempting to load PDF with ${name} configuration...`);
          const loadingTask = pdfjsLib.getDocument(config);
          pdf = await loadingTask.promise;
          console.log(`✅ PDF loaded successfully with ${name} config`);
          break;
        } catch (configError) {
          console.warn(`⚠️ ${name} loading failed:`, configError.message);
          if (name === 'Minimal') {
            console.error('❌ All PDF loading methods failed');
            console.error('PDF file info:', {
              name: file.name,
              size: file.size,
              type: file.type,
              arrayBufferSize: arrayBuffer.byteLength
            });
            throw new Error(`Cannot read PDF file - it may be corrupted, password-protected, or use unsupported features: ${configError.message}`);
          }
        }
      }
      
      console.log('📄 PDF has', pdf.numPages, 'pages');
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      let fullText = '';
      let successfulPages = 0;
      let imageBasedPages = 0;
      
      // Process pages one by one (limit to first 10 for performance)
      const maxPages = Math.min(pdf.numPages, 10);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`📖 Processing page ${pageNum}/${maxPages}`);
          
          const page = await pdf.getPage(pageNum);
          
          // Try to get text content
          let textContent;
          try {
            textContent = await page.getTextContent();
          } catch (textError) {
            console.warn(`⚠️ Could not get text content for page ${pageNum}:`, textError.message);
            continue;
          }
          
          console.log(`📝 Page ${pageNum} has ${textContent.items?.length || 0} text items`);
          
          // Extract text from this page with multiple methods
          let pageText = '';
          if (textContent && textContent.items && Array.isArray(textContent.items)) {
            console.log(`📝 Page ${pageNum}: Found ${textContent.items.length} text items`);
            
            // Method 1: Standard text extraction
            textContent.items.forEach((item, index) => {
              if (item && typeof item.str === 'string') {
                const text = item.str.trim();
                if (text && text.length > 0) {
                  pageText += text;
                  // Add space if this item doesn't end with space/punctuation and next item doesn't start with punctuation
                  if (index < textContent.items.length - 1 && 
                      !text.match(/[\s\.,;:!?\-]$/) && 
                      textContent.items[index + 1] && 
                      textContent.items[index + 1].str && 
                      !textContent.items[index + 1].str.match(/^[\s\.,;:!?\-]/)) {
                    pageText += ' ';
                  }
                }
              }
            });
            
            // If standard method failed, try alternative extraction
            if (pageText.trim().length === 0) {
              console.log(`🔄 Page ${pageNum}: Standard extraction failed, trying alternative method...`);
              const altText = textContent.items
                .map(item => (item && item.str) ? item.str : '')
                .filter(text => text.trim().length > 0)
                .join(' ');
              pageText = altText;
            }
          } else {
            console.warn(`⚠️ Page ${pageNum}: textContent.items is not valid:`, textContent?.items);
          }
          
          if (pageText.trim().length > 0) {
            fullText += pageText + '\n';
            successfulPages++;
            console.log(`✅ Page ${pageNum}: ${pageText.trim().length} characters extracted`);
          } else {
            console.warn(`⚠️ Page ${pageNum}: No text content found`);
            imageBasedPages++;
          }
          
        } catch (pageError) {
          console.warn(`⚠️ Could not process page ${pageNum}:`, pageError.message);
          imageBasedPages++;
          // Continue with other pages
          continue;
        }
      }
      
      console.log(`📊 Processing complete: ${successfulPages} pages with text, ${imageBasedPages} pages without text`);
      
      // Clean up the text
      const cleanedText = fullText
        .replace(/\s+/g, ' ')
        .replace(/[^\x20-\x7E\u00A0-\u024F\u1E00-\u1EFF]/g, '') // Remove non-printable characters
        .trim();
      
      console.log('📄 Final text length:', cleanedText.length);
      
      if (cleanedText.length === 0) {
        if (imageBasedPages > 0) {
          throw new Error(`Unable to extract text - PDF appears to be image-based (${imageBasedPages} image pages detected). Please use a text-based PDF or convert images to text first.`);
        } else {
          throw new Error('No readable text found in PDF - file may be corrupted, encrypted, or contain only images.');
        }
      }
      
      if (cleanedText.length < 20) {
        console.warn('⚠️ Very little text extracted - PDF might have issues or be mostly image-based');
        if (imageBasedPages > 0) {
          throw new Error(`Insufficient text extracted (${cleanedText.length} characters). PDF appears to have ${imageBasedPages} image-based pages. Please use a text-based PDF.`);
        }
      }
      
      console.log('📝 Sample extracted text:', cleanedText.substring(0, 300) + (cleanedText.length > 300 ? '...' : ''));
      
      return cleanedText;
      
      if (cleanedText.length === 0) {
        console.warn('⚠️ No text extracted from PDF - this usually indicates:');
        console.warn('  1. Image-based PDF (scanned document without OCR)');
        console.warn('  2. Password-protected PDF');
        console.warn('  3. Corrupted or non-standard PDF format');
        console.warn('  4. PDF with only images/graphics');
        throw new Error('Unable to extract text - PDF might be image-based, password-protected, or corrupted. Try converting to a text-searchable PDF.');
      }
      
      if (cleanedText.length < 10) {
        console.warn('⚠️ Very little text extracted, might be an issue');
      }
      
      console.log('📝 Sample extracted text:', cleanedText.substring(0, 200) + '...');
      
      return cleanedText;
      
    } catch (error) {
      console.error('❌ PDF.js extraction completely failed for', file.name, ':', error.message);
      
      // Try fallback method using built-in browser capabilities
      try {
        console.log('🔄 Trying fallback PDF extraction method...');
        const fallbackText = await extractWithFallbackMethod(file);
        if (fallbackText && fallbackText.length > 10) {
          console.log('✅ Fallback extraction succeeded');
          return fallbackText;
        }
      } catch (fallbackError) {
        console.warn('⚠️ Fallback extraction also failed:', fallbackError.message);
      }
      
      // If all methods fail, throw descriptive error
      throw new Error(`Could not extract text from PDF: ${error.message}. This PDF may be image-based, password-protected, corrupted, or use unsupported features.`);
    }
  };

  // Fallback PDF extraction method
  const extractWithFallbackMethod = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const buffer = e.target.result;
          const uint8Array = new Uint8Array(buffer);
          
          // Simple text extraction attempt
          let text = '';
          for (let i = 0; i < uint8Array.length - 1; i++) {
            const char = String.fromCharCode(uint8Array[i]);
            if (char.match(/[a-zA-Z0-9\s@.\-_]/)) {
              text += char;
            }
          }
          
          // Clean up the extracted text
          text = text.replace(/\s+/g, ' ').trim();
          
          if (text.length > 20) {
            resolve(text);
          } else {
            reject(new Error('No meaningful text found with fallback method'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  // AI-powered data extraction using OpenAI
  const extractDataWithAI = async (pdfText, fileName) => {
    if (!pdfText || pdfText.length < 10) {
      throw new Error('Insufficient text for AI analysis');
    }

    try {
      console.log('🤖 Starting AI-powered data extraction...');
      
      const response = await fetch('/api/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: pdfText.substring(0, 4000), // Limit text size for API
          fileName: fileName
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI extraction API failed (${response.status}): ${errorText}`);
      }

      const aiData = await response.json();
      console.log('🎯 AI extraction successful:', aiData);
      
      // Ensure all required fields are present
      return {
        candidateName: aiData.name || 'Name Not Found',
        email: aiData.email || 'Email Not Found',
        education: aiData.education || 'Not Provided',
        role: aiData.role || 'Software Developer',
        skills: Array.isArray(aiData.skills) ? aiData.skills : ['JavaScript', 'HTML', 'CSS'],
        experience: typeof aiData.experience === 'number' ? aiData.experience : 0,
        summary: aiData.summary || `CV analysis for ${fileName}`,
        recommendedRoles: Array.isArray(aiData.recommendedRoles) ? aiData.recommendedRoles : ['Software Developer', 'Engineer']
      };

    } catch (error) {
      console.error('❌ AI extraction failed, using fallback parsing:', error.message);
      
      // Fallback to manual extraction if AI fails
      return {
        candidateName: extractName(pdfText),
        email: extractEmail(pdfText),
        education: extractEducation(pdfText),
        role: extractRole(pdfText),
        skills: extractSkills(pdfText),
        experience: 0,
        summary: `CV analysis for ${fileName} (manual extraction)`,
        recommendedRoles: [extractRole(pdfText), 'Software Engineer', 'Tech Specialist']
      };
    }
  };

  // Extract Name from PDF text (fallback method)
  const extractName = (text) => {
    console.log('👤 Extracting name...');
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for name in first 10 lines
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i];
      
      // Skip headers and contact info
      if (/^(resume|cv|curriculum|vitae|contact|email|phone|address|tel|mobile)$/i.test(line) ||
          /@/.test(line) || /^\d/.test(line) || /\d{3,}/.test(line)) {
        continue;
      }
      
      // Look for name pattern (2-4 capitalized words)
      const words = line.split(/\s+/).filter(w => w.length > 1);
      
      if (words.length >= 2 && words.length <= 4) {
        const isValidName = words.every(word => {
          const clean = word.replace(/[^\w]/g, '');
          return /^[A-Z][a-z]+$/.test(clean) && 
                 clean.length >= 2 && clean.length <= 15 &&
                 !/(Software|Developer|Engineer|Manager|Full|Stack|Senior|Junior|Lead|Data|Web|Mobile|Frontend|Backend)/i.test(clean);
        });
        
        if (isValidName) {
          const name = words.join(' ');
          console.log('✅ Found name:', name);
          return name;
        }
      }
    }
    
    // Look for name before email
    const emailMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      console.log('📧 Found name before email:', emailMatch[1]);
      return emailMatch[1];
    }
    
    console.log('❌ No name found');
    return 'Name Not Found';
  };

  // Extract Email
  const extractEmail = (text) => {
    console.log('📧 Extracting email...');
    
    const emailPattern = /\b[a-zA-Z0-9][a-zA-Z0-9._%+-]*@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}\b/g;
    const emails = text.match(emailPattern);
    
    if (emails && emails.length > 0) {
      // Filter out template emails
      const realEmails = emails.filter(email => 
        !/(example|sample|template|test|dummy|noreply)/.test(email.toLowerCase())
      );
      
      const email = realEmails.length > 0 ? realEmails[0] : emails[0];
      console.log('✅ Found email:', email);
      return email;
    }
    
    console.log('❌ No email found');
    return 'Email Not Found';
  };

  // Extract Education
  const extractEducation = (text) => {
    console.log('🎓 Extracting education...');
    
    // More precise degree patterns with better field extraction
    const degreePatterns = [
      // Bachelor's degrees - must have "bachelor" or clear "b.s"/"b.a" context
      /(?:bachelor[\'s]?|b\.?s\.?|b\.?a\.?)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?(computer\s+science|engineering|mathematics|business|arts|science|technology|information\s+technology|software\s+engineering|data\s+science|economics|finance|marketing|psychology|management|law|medicine|biology|chemistry|physics|english|history|education)/i,
      
      // Master's degrees - must have "master" or clear "m.s"/"m.a" context
      /(?:master[\'s]?|m\.?s\.?|m\.?a\.?|mba|m\.?b\.?a\.?)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?(computer\s+science|engineering|mathematics|business|arts|science|technology|information\s+technology|software\s+engineering|data\s+science|economics|finance|marketing|psychology|management|law|medicine|biology|chemistry|physics|english|history|education|administration)/i,
      
      // PhD - must have clear PhD context
      /(?:phd|ph\.?d\.?|doctorate|doctoral)\s+(?:degree\s+)?(?:in\s+)?(computer\s+science|engineering|mathematics|business|arts|science|technology|information\s+technology|software\s+engineering|data\s+science|economics|finance|marketing|psychology|management|law|medicine|biology|chemistry|physics|english|history|education)/i,
      
      // Technical degrees - must have clear tech degree context
      /(?:b\.?tech|b\.?e\.?|btech|bachelor\s+of\s+technology|bachelor\s+of\s+engineering)\s+(?:in\s+)?(computer\s+science|engineering|information\s+technology|software\s+engineering|electrical|mechanical|civil|electronics|telecommunications|biotechnology)/i,
      /(?:m\.?tech|m\.?e\.?|mtech|master\s+of\s+technology|master\s+of\s+engineering)\s+(?:in\s+)?(computer\s+science|engineering|information\s+technology|software\s+engineering|electrical|mechanical|civil|electronics|telecommunications|biotechnology)/i,
      
      // Professional degrees - ONLY match if in clear legal/medical context
      /(?:juris\s+doctor|j\.?d\.?\s+degree|law\s+degree|llb|ll\.?b\.?)\s*(?:in\s+law)?/i,
      /(?:doctor\s+of\s+medicine|m\.?d\.?\s+degree|medical\s+degree|mbbs|m\.?b\.?b\.?s\.?)\s*(?:in\s+medicine)?/i
    ];
    
    for (const pattern of degreePatterns) {
      const match = text.match(pattern);
      if (match) {
        console.log('🎓 Education match found:', match[0]);
        const fullMatch = match[0];
        
        // Extract degree type from the full match
        let degree = '';
        let field = '';
        
        if (fullMatch.toLowerCase().includes('bachelor') || fullMatch.toLowerCase().includes('b.s') || fullMatch.toLowerCase().includes('b.a')) {
          degree = fullMatch.toLowerCase().includes('b.s') ? 'Bachelor of Science' : 
                  fullMatch.toLowerCase().includes('b.a') ? 'Bachelor of Arts' : 'Bachelor';
        } else if (fullMatch.toLowerCase().includes('master') || fullMatch.toLowerCase().includes('m.s') || fullMatch.toLowerCase().includes('m.a') || fullMatch.toLowerCase().includes('mba')) {
          degree = fullMatch.toLowerCase().includes('mba') ? 'Master of Business Administration' :
                  fullMatch.toLowerCase().includes('m.s') ? 'Master of Science' :
                  fullMatch.toLowerCase().includes('m.a') ? 'Master of Arts' : 'Master';
        } else if (fullMatch.toLowerCase().includes('phd') || fullMatch.toLowerCase().includes('ph.d') || fullMatch.toLowerCase().includes('doctorate')) {
          degree = 'Doctor of Philosophy';
        } else if (fullMatch.toLowerCase().includes('btech') || fullMatch.toLowerCase().includes('b.tech')) {
          degree = 'Bachelor of Technology';
        } else if (fullMatch.toLowerCase().includes('mtech') || fullMatch.toLowerCase().includes('m.tech')) {
          degree = 'Master of Technology';
        } else if (fullMatch.toLowerCase().includes('juris doctor') || fullMatch.toLowerCase().includes('law degree')) {
          degree = 'Juris Doctor (Law Degree)';
        } else if (fullMatch.toLowerCase().includes('doctor of medicine') || fullMatch.toLowerCase().includes('medical degree')) {
          degree = 'Doctor of Medicine';
        }
        
        // Extract field from the match
        const fieldMatch = fullMatch.match(/(?:in\s+)?(computer\s+science|engineering|mathematics|business|arts|science|technology|information\s+technology|software\s+engineering|data\s+science|economics|finance|marketing|psychology|management|law|medicine|biology|chemistry|physics|english|history|education|administration|electrical|mechanical|civil|electronics|telecommunications|biotechnology)/i);
        if (fieldMatch) {
          field = fieldMatch[1].toLowerCase()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        const education = field ? `${degree} in ${field}` : degree;
        console.log('✅ Found education:', education);
        return education;
      }
    }
    
    // Look for specific university/college mentions with degree
    const universityPatterns = [
      /(graduated\s+from|studied\s+at|attended)\s+([^,\n\r]{5,50})\s*(university|college|institute)/i,
      /(?:bachelor|master|phd|degree)\s+from\s+([^,\n\r]{5,50})\s*(university|college|institute)/i
    ];
    
    for (const pattern of universityPatterns) {
      const match = text.match(pattern);
      if (match) {
        const institution = match[2].trim();
        if (institution.length > 3 && institution.length < 50) {
          const education = `Degree from ${institution} ${match[3]}`;
          console.log('✅ Found university education:', education);
          return education;
        }
      }
    }
    
    // Look for education section keywords
    const educationSectionMatch = text.match(/(?:education|academic|qualification)[:\s\n]+(.*?)(?:\n\n|experience|skills|work|projects)/is);
    if (educationSectionMatch) {
      const educationSection = educationSectionMatch[1].trim();
      // Look for degree-like words in education section
      const degreeKeywords = /(bachelor|master|phd|b\.?s\.?|m\.?s\.?|b\.?a\.?|m\.?a\.?|mba|btech|mtech)/i;
      const match = educationSection.match(degreeKeywords);
      if (match) {
        // Extract first meaningful line from education section
        const firstLine = educationSection.split('\n')[0].trim();
        if (firstLine.length > 5 && firstLine.length < 100) {
          console.log('✅ Found education from section:', firstLine);
          return firstLine;
        }
      }
    }
    
    console.log('❌ No education found');
    return 'Education Not Found';
  };

  // Extract Role/Position
  const extractRole = (text) => {
    console.log('💼 Extracting role...');
    
    const rolePatterns = [
      /(software|web|mobile|frontend|backend|full[\s-]?stack)\s+(developer|engineer)/i,
      /(data\s+scientist|data\s+analyst)/i,
      /(product|project)\s+manager/i,
      /(ui|ux|ui\/ux)\s+designer/i,
      /(devops|cloud)\s+engineer/i,
      /(quality\s+assurance|qa)\s+engineer/i,
      /(machine\s+learning)\s+engineer/i
    ];
    
    for (const pattern of rolePatterns) {
      const match = text.match(pattern);
      if (match) {
        const role = match[0].split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        console.log('✅ Found role:', role);
        return role;
      }
    }
    
    console.log('❌ No specific role found');
    return 'Software Developer';
  };

  // Extract Skills
  const extractSkills = (text) => {
    console.log('🔧 Extracting skills...');
    
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'HTML', 'CSS', 'SQL',
      'TypeScript', 'Angular', 'Vue.js', 'PHP', 'C++', 'C#', 'Git', 'Docker',
      'Kubernetes', 'AWS', 'Azure', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
      'Express', 'Django', 'Flask', 'Spring', 'Laravel', 'Figma', 'Photoshop'
    ];
    
    const foundSkills = [];
    const lowerText = text.toLowerCase();
    
    commonSkills.forEach(skill => {
      if (lowerText.includes(skill.toLowerCase())) {
        foundSkills.push(skill);
      }
    });
    
    const skills = foundSkills.length > 0 ? foundSkills.slice(0, 8) : ['JavaScript', 'HTML', 'CSS'];
    console.log('✅ Found skills:', skills);
    return skills;
  };

  // Process uploaded files
  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('No files to process');
      return;
    }

    setProcessing(true);
    const results = [];

    try {
      for (const fileData of uploadedFiles) {
        try {
          console.log('📋 Processing file:', fileData.name);
          toast.loading(`Processing ${fileData.name}...`);
          
          // Extract text from PDF with fallback methods
          const pdfText = await extractTextFromPDF(fileData.file);
          
          console.log('📋 Successfully extracted', pdfText.length, 'characters from', fileData.name);
          
          if (!pdfText || pdfText.trim().length < 10) {
            throw new Error('No meaningful text could be extracted from PDF');
          }

          // Extract information using AI-powered analysis
          console.log('🔍 Starting AI-powered data extraction...');
          const extractedData = await extractDataWithAI(pdfText, fileData.name);

          // Frontend fallback for education
          if (!extractedData.education || extractedData.education === 'Not Provided' || extractedData.education === 'Education Not Found') {
            console.log('Frontend fallback: extracting education locally.');
            extractedData.education = extractEducation(pdfText);
          }

          const cvData = {
            id: fileData.id,
            pdfName: fileData.name,
            ...extractedData
          };

          results.push(cvData);
          toast.dismiss();
          toast.success(`✅ AI analysis complete: ${extractedData.candidateName || 'Unknown'}`);

        } catch (error) {
          console.error('❌ Processing error for', fileData.name, ':', error.message);
          toast.dismiss();
          
          // Determine error type and provide specific feedback
          let errorMessage = '';
          let fallbackData = null;
          
          if (error.message.includes('Could not extract text') || error.message.includes('No meaningful text')) {
            errorMessage = `${fileData.name}: Unable to extract text - PDF might be image-based, password-protected, or corrupted. Please try converting to text-based PDF or use OCR.`;
            
            // Create fallback entry with suggestions
            fallbackData = {
              id: fileData.id,
              pdfName: fileData.name,
              candidateName: 'Text Extraction Failed',
              email: 'extraction.failed@example.com',
              education: 'Unable to extract - Please check PDF format',
              role: 'PDF Analysis Failed',
              skills: ['PDF Processing Error'],
              experience: 0,
              summary: `Failed to extract text from ${fileData.name}. This usually happens with: 1) Image-based PDFs (scanned documents), 2) Password-protected files, 3) Corrupted files, 4) Non-standard PDF formats. Try converting the PDF to text-searchable format.`,
              recommendedRoles: ['Manual Review Required']
            };
          } else if (error.message.includes('AI extraction API failed')) {
            errorMessage = `${fileData.name}: AI analysis failed - Using manual extraction as fallback`;
            // In this case, we should still have some extracted text, so let's try manual parsing
            try {
              const pdfText = await extractTextFromPDF(fileData.file);
              fallbackData = {
                id: fileData.id,
                pdfName: fileData.name,
                candidateName: extractName(pdfText) || 'Name Not Found',
                email: extractEmail(pdfText) || 'Email Not Found',
                education: extractEducation(pdfText) || 'Education Not Found',
                role: extractRole(pdfText) || 'Role Not Specified',
                skills: extractSkills(pdfText) || ['Skills Not Found'],
                experience: 0,
                summary: `Manual extraction for ${fileData.name} (AI failed)`,
                recommendedRoles: ['Manual Review Needed', 'General Position']
              };
            } catch (fallbackError) {
              fallbackData = {
                id: fileData.id,
                pdfName: fileData.name,
                candidateName: 'Complete Processing Failure',
                email: 'processing.failed@example.com',
                education: 'Could not process file',
                role: 'Processing Error',
                skills: ['File Processing Failed'],
                experience: 0,
                summary: `Complete processing failure for ${fileData.name}`,
                recommendedRoles: ['Manual Review Required']
              };
            }
          } else {
            errorMessage = `Failed to process ${fileData.name}: ${error.message}`;
            fallbackData = {
              id: fileData.id,
              pdfName: fileData.name,
              candidateName: 'Unknown Processing Error',
              email: 'error@example.com',
              education: 'Processing failed',
              role: 'Error',
              skills: ['Processing Error'],
              experience: 0,
              summary: `Error processing ${fileData.name}: ${error.message}`,
              recommendedRoles: ['Manual Review Required']
            };
          }
          
          toast.error(errorMessage);
          results.push(fallbackData);
        }
      }

      setProcessedCVs(results);
      toast.success(`Completed processing ${results.length} CV(s)`);

    } catch (error) {
      console.error('Processing error:', error);
      toast.error('CV processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <Toaster position="top-center" />

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CV Upload & Analysis</h1>
          <p className="text-gray-600">Upload CVs and get real data extraction</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload CVs</h2>

          {/* Drag & Drop Area */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ${
              dragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />

            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900 mb-1">
                  {uploading ? "Uploading..." : "Drag & drop up to 10 PDFs here"}
                </p>
                <p className="text-sm text-gray-500">
                  (Max 10MB per file) or <span className="text-blue-600 hover:text-blue-500 cursor-pointer">browse files</span>
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Files */}
          {uploadedFiles.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Uploaded Files ({uploadedFiles.length})</h3>
                <button
                  onClick={processFiles}
                  disabled={processing}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 py-3 rounded-xl font-medium transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  {processing ? "Processing..." : "Analyze CVs"}
                </button>
              </div>

              <div className="space-y-3">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="bg-gray-100 rounded-xl p-4 flex items-center justify-between hover:bg-gray-200 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        Ready
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {processedCVs.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Analysis Results</h2>

            {processedCVs.map((cv) => (
              <div key={cv.id} className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-200">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">{cv.candidateName}</h3>
                  <p className="text-sm text-gray-500">{cv.pdfName}</p>
                </div>

                {/* Role Tag */}
                <div className="mb-4">
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {cv.role}
                  </span>
                </div>

                {/* Contact & Education Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Email:</span> {cv.email}
                  </div>
                  <div>
                    <span className="font-medium">Education:</span> {cv.education}
                  </div>
                </div>

                {/* Summary */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Summary</h4>
                  <p className="text-gray-600 leading-relaxed">{cv.summary}</p>
                </div>

                {/* Skills */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {cv.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommended Roles */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recommended Roles</h4>
                  <div className="flex flex-wrap gap-2">
                    {cv.recommendedRoles.map((role, index) => (
                      <span
                        key={index}
                        className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back Button */}
        <div className="text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
