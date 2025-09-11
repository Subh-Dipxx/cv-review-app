'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

export default function ProcessCVsPage() {
  const { user } = useUser();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
    if (pdfFiles.length !== acceptedFiles.length) {
      toast.error('Only PDF files are allowed');
    }
    if (files.length + pdfFiles.length > 10) {
      toast.error('Maximum 10 files allowed');
      return;
    }
    setFiles(prev => [...prev, ...pdfFiles.slice(0, 10 - prev.length)]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 10,
    maxSize: 5 * 1024 * 1024 // 5MB
  });

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processCVs = async () => {
    if (files.length === 0) {
      toast.error('Please select at least one PDF file');
      return;
    }

    setLoading(true);
    toast.loading('Processing CVs...', { id: 'processing' });

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/process-cv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data.results || []);
        toast.success(`Successfully processed ${data.results?.length || 0} CVs`, { id: 'processing' });
        // Clear files after successful processing
        setFiles([]);
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error("CV processing error:", error);
      toast.error(`Processing failed: ${error.message}`, { id: "processing" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Toaster position="top-center" />
        
        {/* Header with Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Process CVs</h1>
              <p className="text-gray-600 mt-1">Upload and analyze PDF resumes with AI-powered insights</p>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/dashboard" 
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium shadow-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h0a2 2 0 012 2v2H8V5z" />
                </svg>
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/resumes" 
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-sm flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>List All Resumes</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Welcome Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 sm:px-8 sm:py-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    CV Analysis Processing
                  </h2>
                  <p className="text-blue-100 text-lg max-w-2xl">
                    Upload and analyze CVs with AI-powered insights. Get intelligent candidate recommendations, 
                    skill analysis, and comprehensive filtering tools.
                  </p>
                  {user && (
                    <div className="mt-4 flex items-center space-x-2">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.firstName?.[0] || user.emailAddresses[0]?.emailAddress[0]}
                        </span>
                      </div>
                      <span className="text-white font-medium">
                        Hello, {user.firstName || user.emailAddresses[0]?.emailAddress.split('@')[0]}!
                      </span>
                    </div>
                  )}
                </div>
                <div className="hidden lg:block">
                  <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Files Ready</p>
                  <p className="text-2xl font-semibold text-gray-900">{files.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Processed</p>
                  <p className="text-2xl font-semibold text-gray-900">{results.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Success Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {files.length > 0 ? Math.round((results.length / files.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload CVs</h2>
                <p className="text-sm text-gray-500">Drag and drop or click to select PDF files</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Max 10 files, 5MB each</span>
              </div>
            </div>
            
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragActive 
                  ? "border-blue-400 bg-blue-50 scale-105" 
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              }`}
            >
              <input {...getInputProps()} />
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                {isDragActive ? (
                  <div>
                    <p className="text-lg font-medium text-blue-600">Drop your PDF files here</p>
                    <p className="text-sm text-blue-500">Release to upload</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-lg font-medium text-gray-700">Drag & drop PDFs here</p>
                    <p className="text-sm text-gray-500">or <span className="text-blue-600 font-medium">click to browse</span></p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* File Management Section */}
          {files.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Uploaded Files ({files.length}/10)
                </h2>
                <button
                  onClick={processCVs}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-400 hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    "Process CVs"
                  )}
                </button>
              </div>
              
              <div className="space-y-3">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results Section */}
          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Processing Results ({results.length} files processed)
                </h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Successfully processed</span>
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {results.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate" title={result.name || result.fileName}>
                          {result.name || "Not specified"}
                        </h3>
                        <p className="text-xs text-gray-400 truncate">{result.fileName}</p>
                      </div>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center ml-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Experience:</span>
                        <span className="font-medium text-gray-900">
                          {result.yearsOfExperience > 0 ? `${result.yearsOfExperience} year${result.yearsOfExperience !== 1 ? 's' : ''}` : 'No experience'}
                        </span>
                      </div>
                      
                      {(result.education || result.collegeName) && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-500">Education:</span>
                          <span className="font-medium text-gray-900 text-right text-xs max-w-32 truncate" title={result.education || result.collegeName}>
                            {result.education || result.collegeName}
                          </span>
                        </div>
                      )}
                      
                      {(result.email || result.summary?.email) && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="font-medium text-gray-900 text-right text-xs max-w-32 truncate" title={result.email || result.summary?.email}>
                            {result.email || result.summary?.email}
                          </span>
                        </div>
                      )}
                      
                      {(result.phoneNumber || result.contact || result.summary?.contact) && (
                        <div className="flex items-start justify-between">
                          <span className="text-gray-500">Phone:</span>
                          <span className="font-medium text-gray-900 text-right text-xs max-w-32 truncate" title={result.phoneNumber || result.contact || result.summary?.contact}>
                            {result.phoneNumber || result.contact || result.summary?.contact}
                          </span>
                        </div>
                      )}
                    </div>

                    {result.recommendedRoles && result.recommendedRoles.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Recommended Roles:</p>
                        <div className="space-y-1">
                          {result.recommendedRoles.slice(0, 3).map((roleObj, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-gray-700">
                                {typeof roleObj === 'string' ? roleObj : roleObj.role}
                              </span>
                              {typeof roleObj === 'object' && roleObj.percent && (
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                  {roleObj.percent}%
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-500 mb-1">Summary:</p>
                      <p className="text-xs text-gray-700 line-clamp-3">{
                        typeof result.summary === 'string' 
                          ? result.summary 
                          : result.summary?.shortSummary || result.summary?.summary || "No summary available."
                      }</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
