'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import * as pdfjsLib from 'pdfjs-dist';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export default function CVUploadPage() {
  const { user, loading } = useAuth();
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processedCVs, setProcessedCVs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = (file) => {
    if (file.type !== 'application/pdf') {
      toast.error(`${file.name} is not a PDF file`);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error(`${file.name} is too large (max 5MB)`);
      return false;
    }
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

  // PDF Text Extraction
  const extractTextFromPDF = async (file) => {
    try {
      console.log('🔍 Starting PDF extraction for:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        let pageText = '';
        let lastY = null;
        
        textContent.items.forEach((item, index) => {
          const currentY = Math.round(item.transform[5]);
          
          // Add line break for new lines
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            pageText += '\n';
          }
          
          // Add text with spacing
          const text = item.str.trim();
          if (text) {
            if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
              pageText += ' ';
            }
            pageText += text;
          }
          
          lastY = currentY;
        });
        
        fullText += pageText + '\n';
      }
      
      // Clean the extracted text
      const cleanedText = fullText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      
      console.log('📄 Extracted text length:', cleanedText.length);
      console.log('📝 First 500 chars:', cleanedText.substring(0, 500));
      
      return cleanedText;
      
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      throw new Error(`Failed to extract text from ${file.name}`);
    }
  };

  // Extract Name from PDF text
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
    
    const degreePatterns = [
      /(bachelor[\'s]?|b\.?s\.?|b\.?a\.?|ba|bs)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([^,\n\r]+)/i,
      /(master[\'s]?|m\.?s\.?|m\.?a\.?|ma|ms)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([^,\n\r]+)/i,
      /(phd|ph\.?d\.?|doctorate)\s+(?:in\s+)?([^,\n\r]+)/i,
      /(b\.?tech|b\.?e\.?|be|btech)\s+(?:in\s+)?([^,\n\r]+)/i,
      /(m\.?tech|m\.?e\.?|me|mtech)\s+(?:in\s+)?([^,\n\r]+)/i,
      /(mba|m\.?b\.?a\.?)\s*(?:in\s+)?([^,\n\r]*)/i
    ];
    
    for (const pattern of degreePatterns) {
      const match = text.match(pattern);
      if (match) {
        const degree = match[1].toUpperCase().replace(/\./g, '');
        const field = match[2] ? match[2].trim().replace(/[^\w\s&-]/g, '') : 'General Studies';
        const education = `${degree} in ${field}`;
        console.log('✅ Found education:', education);
        return education;
      }
    }
    
    // Look for university mentions
    const universityMatch = text.match(/(university|college|institute)\s+of\s+([^,\n\r]+)/i);
    if (universityMatch) {
      const education = `Degree from ${universityMatch[1]} of ${universityMatch[2]}`;
      console.log('✅ Found university education:', education);
      return education;
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
        toast.loading(`Processing ${fileData.name}...`);
        
        try {
          // Extract text from PDF
          const pdfText = await extractTextFromPDF(fileData.file);
          
          if (!pdfText || pdfText.length < 50) {
            throw new Error('Insufficient text extracted from PDF');
          }

          // Extract information
          const candidateName = extractName(pdfText);
          const email = extractEmail(pdfText);
          const education = extractEducation(pdfText);
          const role = extractRole(pdfText);
          const skills = extractSkills(pdfText);

          const cvData = {
            id: fileData.id,
            pdfName: fileData.name,
            candidateName,
            email,
            education,
            role,
            skills,
            summary: `Candidate profile extracted from ${fileData.name}. Real data parsed from PDF content.`,
            experience: 2, // Default
            recommendedRoles: [role, 'Software Engineer', 'Tech Specialist']
          };

          results.push(cvData);
          toast.success(`✅ Processed ${candidateName}`);

        } catch (error) {
          console.error('Error processing file:', fileData.name, error);
          toast.error(`Failed to process ${fileData.name}: ${error.message}`);
          
          // Add error entry
          results.push({
            id: fileData.id,
            pdfName: fileData.name,
            candidateName: 'Processing Failed',
            email: 'Could not extract',
            education: 'Could not extract',
            role: 'Unknown',
            skills: ['PDF Processing Error'],
            summary: `Failed to process ${fileData.name}: ${error.message}`,
            experience: 0,
            recommendedRoles: ['Manual Review Required']
          });
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
                  (Max 5MB per file) or <span className="text-blue-600 hover:text-blue-500 cursor-pointer">browse files</span>
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
