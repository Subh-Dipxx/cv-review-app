"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Toaster, toast } from "react-hot-toast";
import Link from "next/link";

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [parsedResults, setParsedResults] = useState(null);
  const [categorizedResults, setCategorizedResults] = useState(null);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(1);
  const [theme, setTheme] = useState("light");

  // Setup dropzone
  const onDrop = useCallback((acceptedFiles) => {
    setFiles(acceptedFiles);
    setResults([]);
    setParsedResults(null);
    setCategorizedResults(null);
    setError(null);
    setActiveStep(1);
    toast.success(`${acceptedFiles.length} file(s) selected`);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 10,
    maxSize: 5 * 1024 * 1024, // 5MB
  });

  // Process CV files
  const processFiles = async () => {
    if (files.length === 0) {
      toast.error("Please select files first");
      return;
    }
    
    setProcessing(true);
    setError(null);
    setActiveStep(2);
    
    try {
      // Step 1: Parse CV files
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });
      
      const parseResponse = await toast.promise(
        fetch("/api/parse-cv", {
          method: "POST",
          body: formData,
        }),
        {
          loading: 'Parsing CV files...',
          success: 'Files parsed successfully',
          error: 'Failed to parse files'
        }
      );
      
      if (!parseResponse.ok) {
        throw new Error(`Failed to parse files: ${parseResponse.status}`);
      }
      
      const parseData = await parseResponse.json();
      setParsedResults(parseData.results);
      
      // Step 2: Process/categorize CVs
      const processResponse = await toast.promise(
        fetch("/api/process-cv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ results: parseData.results }),
        }),
        {
          loading: 'Processing and categorizing CVs...',
          success: 'CVs processed successfully',
          error: 'Failed to process CVs'
        }
      );
      
      if (!processResponse.ok) {
        throw new Error(`Failed to process CVs: ${processResponse.status}`);
      }
      
      const processData = await processResponse.json();
      
      // Check if we have an error in the response
      if (processData.error) {
        throw new Error(`API error: ${processData.error}`);
      }
      
      // Validate the categorized data
      if (!processData.categorized || !Array.isArray(processData.categorized)) {
        throw new Error("Invalid response format from CV processing API");
      }
      
      // Handle empty results
      if (processData.categorized.length === 0) {
        throw new Error("No results returned from CV processing");
      }
      
      setCategorizedResults(processData.categorized);
      setActiveStep(3);
    } catch (err) {
      console.error("Error processing files:", err);
      setError(err.message);
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // Reset and start over
  const resetForm = () => {
    setFiles([]);
    setResults([]);
    setParsedResults(null);
    setCategorizedResults(null);
    setError(null);
    setActiveStep(1);
    toast.success("Form reset. Start with new files.");
  };

  // Effect to check for system color scheme preference
  useEffect(() => {
    // Check for system preference
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    // Check for stored preference
    const storedTheme = localStorage.getItem("theme");
    // Use stored preference if available, otherwise use system preference
    setTheme(storedTheme || (isDark ? "dark" : "light"));
    
    // Listen for changes to color scheme preference
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => setTheme(e.matches ? "dark" : "light");
    mediaQuery.addEventListener("change", handleChange);
    
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    // Update state
    setTheme(newTheme);
    // Store in localStorage for persistence
    localStorage.setItem("theme", newTheme);
  };
  
  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-900 text-white" : "bg-white text-gray-900"} transition-colors duration-200`}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: theme === "dark" ? {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155'
          } : {}
        }}
      />
      
      <div className="max-w-4xl mx-auto py-6 px-4">
        <div className="bg-white p-6 rounded shadow-sm">
          {/* Step 1: File Upload */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div 
                {...getRootProps()} 
                className="border border-dashed rounded p-6 text-center cursor-pointer hover:bg-gray-50"
              >
                <input {...getInputProps()} />
                <p className="text-gray-600">
                  Drag & drop up to 10 PDFs here
                </p>
                <p className="text-gray-400 text-xs">
                  (Max 5MB per file)
                </p>
              </div>
              
              {files.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-md font-medium mb-2 text-gray-700">
                    Uploaded Files ({files.length}/10)
                  </h3>
                  <div className="space-y-1">
                    {files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <p className="text-gray-700">
                          {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </p>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setFiles(files.filter((_, i) => i !== index));
                            if (files.length === 1) {
                              resetForm();
                            }
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={processFiles}
                      disabled={processing}
                      className="px-6 py-2 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {processing ? 'Processing...' : 'Process CVs'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Step 2: Processing */}
          {activeStep === 2 && processing && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-md">Processing your files...</p>
              <p className="text-sm text-gray-500 mt-1">This might take a moment</p>
            </div>
          )}
          
          {/* Step 3: Results */}
          {activeStep === 3 && categorizedResults && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Results ({categorizedResults.length} files processed)</h2>
              
              <div className="space-y-4">
                {categorizedResults.map((result, index) => (
                  <div key={index} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-medium uppercase">{result.name || "UNNAMED"}</h3>
                      <span className="text-gray-500 text-sm">{result.fileName}</span>
                    </div>
                    
                    <div className="mb-3">
                      <span className="px-3 py-1 rounded-md text-sm font-medium bg-blue-100 text-blue-800">
                        {result.category}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-gray-700">
                      {result.jobTitle && (
                        <div className="text-sm">
                          <span className="font-medium">Current Role:</span> {result.jobTitle}
                        </div>
                      )}
                      
                      {result.yearsOfExperience !== undefined && (
                        <div className="text-sm">
                          <span className="font-medium">Experience:</span> {result.yearsOfExperience > 0 ? `${result.yearsOfExperience} years` : "No experience"}
                        </div>
                      )}
                      
                      {result.email && (
                        <div className="text-sm">
                          <span className="font-medium">Email:</span> {result.email}
                        </div>
                      )}
                      
                      {result.collegeName && (
                        <div className="text-sm">
                          <span className="font-medium">Education:</span> {result.collegeName}
                        </div>
                      )}
                      
                      {result.recommendedRoles && result.recommendedRoles.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-sm">Recommended Roles:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {result.recommendedRoles.map((role, i) => (
                              <span key={i} className="bg-green-50 border border-green-200 px-3 py-1 rounded-md text-sm">
                                {role.name}
                                {role.percentage && <span className="ml-1 text-green-700">{role.percentage}%</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {result.professionalSummary && (
                        <div className="text-sm mt-3">
                          <span className="font-medium">Professional Summary:</span>
                          <p className="mt-1 text-gray-600">{result.professionalSummary}</p>
                        </div>
                      )}
                      
                      {result.skills && result.skills.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium text-sm">Skills:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {typeof result.skills === 'string' 
                              ? JSON.parse(result.skills).map((skill, i) => (
                                  <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{skill}</span>
                                ))
                              : Array.isArray(result.skills) && result.skills.map((skill, i) => (
                                  <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{skill}</span>
                                ))
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4 flex space-x-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Process More Files
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
