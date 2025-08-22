"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";

function CVUploadApp() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  const onDrop = (acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter((file) =>
      file.type === "application/pdf"
    );
    
    if (pdfFiles.length === 0) {
      toast.error("Please select only PDF files!");
      return;
    }
    
    if (pdfFiles.length + files.length > 10) {
      toast.error("You can upload a maximum of 10 PDFs!");
      return;
    }
    
    setFiles([...files, ...pdfFiles]);
    toast.success(`${pdfFiles.length} PDF(s) uploaded successfully!`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 5 * 1024 * 1024, // 5MB limit
    multiple: true,
  });

  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    toast.success("File removed successfully!");
  };

  const processCVs = async () => {
    if (files.length === 0) {
      toast.error("Please upload at least one PDF!");
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      toast.loading("Parsing PDFs...", { id: "processing" });
      console.log("Starting PDF parsing process...");

      const formData = new FormData();
      files.forEach((file) => {
        console.log(`Adding file to FormData: ${file.name}, size: ${file.size} bytes`);
        formData.append("files", file);
      });

      // Debug log before fetch
      console.log("Sending request to /api/parse-cv...");
      
      const parseStartTime = Date.now();
      const parseResponse = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });
      const parseEndTime = Date.now();
      
      console.log(`Parse API responded in ${parseEndTime - parseStartTime}ms with status: ${parseResponse.status}`);

      let parseData;
      try {
        parseData = await parseResponse.json();
        console.log("Parse API response parsed successfully:", parseData);
      } catch (parseError) {
        console.error("Failed to parse JSON response from parse-cv:", parseError);
        throw new Error("The server returned an unexpected response. Please check your PDF files or contact support.");
      }

      if (!parseResponse.ok) {
        console.error("Parse API error:", parseData?.error || parseResponse.status);
        throw new Error(parseData?.error || `Parse failed with status ${parseResponse.status}`);
      }
      if (parseData?.error) {
        console.error("Parse API returned error:", parseData.error);
        throw new Error(parseData.error);
      }

      console.log(`Successfully parsed ${parseData.results.length} files`);
      toast.loading("Categorizing CVs...", { id: "processing" });

      // Debug log before fetch
      console.log("Sending request to /api/process-cv...");
      
      const processStartTime = Date.now();
      const processResponse = await fetch("/api/process-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: parseData.results }),
      });
      const processEndTime = Date.now();
      
      console.log(`Process API responded in ${processEndTime - processStartTime}ms with status: ${processResponse.status}`);

      let processData;
      try {
        processData = await processResponse.json();
        console.log("Process API response parsed successfully:", processData);
      } catch (processError) {
        console.error("Failed to parse JSON response from process-cv:", processError);
        throw new Error("The server returned an unexpected response for process-cv.");
      }

      if (!processResponse.ok) {
        console.error("Process API error:", processData?.error || processResponse.status);
        throw new Error(processData?.error || `Process failed with status ${processResponse.status}`);
      }
      if (processData?.error) {
        console.error("Process API returned error:", processData.error);
        throw new Error(processData.error);
      }

      const categorized = processData.categorized || [];
      
      // Debug: Log the received data
      console.log("Received categorized data:", categorized);
      categorized.forEach((result, i) => {
        console.log(`Result ${i + 1}:`, {
          fileName: result.fileName,
          email: result.email,
          collegeName: result.collegeName,
          name: result.name
        });
      });
      
      // Safety check for valid results
      const validResults = categorized.filter(result => 
        result && typeof result === 'object' && result.fileName
      );
      
      setResults(validResults);
      console.log(`Processing complete! ${validResults.length} files categorized`);
      
      toast.success(
        `Successfully processed ${validResults.length} files!`,
        { id: "processing" }
      );
    } catch (error) {
      console.error("CV processing error:", error);
      toast.error(`Processing failed: ${error.message}`, { id: "processing" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <Toaster position="top-center" />
      <h1 className="text-3xl font-bold mb-6 text-gray-800">CV Review App</h1>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-6 rounded-lg w-full max-w-md text-center cursor-pointer transition-colors ${
          isDragActive 
            ? "border-blue-400 bg-blue-50" 
            : "border-gray-400 bg-white hover:border-gray-500"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600">Drop the PDFs here...</p>
        ) : (
          <>
            <p className="text-gray-700">Drag & drop up to 10 PDFs here, or click to select files</p>
            <p className="text-sm text-gray-500 mt-2">(Max 5MB per file)</p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="mt-6 w-full max-w-md">
          <h2 className="text-xl font-semibold text-gray-800">
            Uploaded Files ({files.length}/10)
          </h2>
          <ul className="mt-2 space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex justify-between items-center text-gray-700 bg-white p-3 rounded shadow-sm">
                <span className="flex-1 truncate">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 ml-2 px-2 py-1 rounded hover:bg-red-50"
                  disabled={loading}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={processCVs}
            disabled={loading}
            className="mt-4 w-full bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
          >
            {loading ? "Processing..." : "Process CVs"}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-6 w-full max-w-4xl">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Results ({results.length} files processed)
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((result, index) => (
              <div key={index} className="border p-4 rounded-lg bg-white shadow-sm">
                {/* Name and File */}
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 truncate" title={result.name || result.fileName}>
                    {result.name || "Not specified"}
                  </h3>
                  <span className="text-xs text-gray-400">{result.fileName}</span>
                </div>
                
                {/* Job Title and Category */}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    {result.category}
                  </span>
                  {result.jobTitle && (
                    <span className="text-gray-700 text-sm">
                      {result.jobTitle}
                    </span>
                  )}
                </div>
                
                {/* Experience */}
                <p className="mt-2 text-sm text-gray-600">
                  {result.yearsOfExperience > 0 ? 
                    `${result.yearsOfExperience} year${result.yearsOfExperience !== 1 ? 's' : ''} experience` : 
                    'No experience'}
                </p>
                
                {/* Contact Information */}
                <div className="mt-3 space-y-1 text-sm">
                  {result.email && (
                    <p className="text-gray-600 flex items-center">
                      <span className="font-medium mr-1">Email:</span> {result.email}
                    </p>
                  )}
                  {result.collegeName && (
                    <p className="text-gray-600 flex items-center">
                      <span className="font-medium mr-1">Education:</span> {result.collegeName}
                    </p>
                  )}
                </div>
                
                {/* Recommended Roles */}
                {result.recommendedRoles && result.recommendedRoles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 font-medium">Recommended Roles:</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.recommendedRoles.map((roleObj, i) => (
                        <span key={i} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                          {typeof roleObj === 'string' ? roleObj : roleObj.role}
                          {typeof roleObj === 'object' && roleObj.match && (
                            <span className="ml-1 text-green-600">({roleObj.match}%)</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Professional Summary */}
                <div className="mt-3">
                  <p className="text-xs text-gray-500 font-medium">Professional Summary:</p>
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {result.professionalSummary || result.summary || "No summary available."}
                  </p>
                </div>
                
                {/* Skills */}
                {result.skills && result.skills.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Skills:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.skills.slice(0, 5).map((skill, i) => (
                        <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          {skill}
                        </span>
                      ))}
                      {result.skills.length > 5 && (
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                          +{result.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Note: Projects section removed as requested */}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Sign In Page Component
function SignInPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">CV Review App</h1>
        <p className="text-gray-600 mb-6">
          AI-powered CV categorization and analysis tool
        </p>
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Please sign in to upload and analyze CVs
        </p>
        <SignInButton mode="modal">
          <button className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
            Sign In to Continue
          </button>
        </SignInButton>
      </div>
    </div>
  );
}

// Main Page Component with Authentication
export default function Page() {
  return (
    <div>
      <Toaster position="top-right" />
      
      <SignedOut>
        <SignInPage />
      </SignedOut>
      
      <SignedIn>
        <CVUploadApp />
      </SignedIn>
    </div>
  );
}