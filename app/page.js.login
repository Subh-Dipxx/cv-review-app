"use client";

import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";
import { useRouter } from "next/navigation";

function Page() {
  const router = useRouter();
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Check if the user is logged in
    const checkLoginStatus = () => {
      try {
        // In a real app, you would verify the token with the server
        const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
        const userData = localStorage.getItem("user");
        
        if (isLoggedIn && userData) {
          setUser(JSON.parse(userData));
        } else {
          // Redirect to login
          router.push("/login");
        }
      } catch (error) {
        console.error("Authentication error:", error);
        // Redirect to login
        router.push("/login");
      }
    };
    
    checkLoginStatus();
    
    // Welcome notification when the app loads for the first time
    toast.success("Welcome to CV Review App! Upload PDFs to get started.", {
      duration: 5000,
      icon: "",
    });
  }, [router]);

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("user");
    
    // Redirect to login
    router.push("/login");
    toast.success("Logged out successfully!");
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    toast.success("All files and results cleared!");
  };

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

      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const parseResponse = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });

      let parseData;
      try {
        parseData = await parseResponse.json();
      } catch {
        throw new Error("The server returned an unexpected response. Please check your PDF files or contact support.");
      }

      if (!parseResponse.ok) {
        throw new Error(parseData?.error || `Parse failed with status ${parseResponse.status}`);
      }
      if (parseData?.error) {
        throw new Error(parseData.error);
      }

      toast.loading("Categorizing CVs...", { id: "processing" });

      const processResponse = await fetch("/api/process-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: parseData.results }),
      });

      let processData;
      try {
        processData = await processResponse.json();
      } catch {
        throw new Error("The server returned an unexpected response for process-cv.");
      }

      if (!processResponse.ok) {
        throw new Error(processData?.error || `Process failed with status ${processResponse.status}`);
      }
      if (processData?.error) {
        throw new Error(processData?.error);
      }

      setResults(processData.categorized || []);
      toast.success(
        `Successfully processed ${processData.categorized?.length || 0} files!`,
        { id: "processing" }
      );
    } catch (error) {
      console.error("CV processing error:", error);
      toast.error(`Processing failed: ${error.message}`, { id: "processing" });
    } finally {
      setLoading(false);
    }
  };

  // If the user is not yet loaded, show a loading state
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <Toaster position="top-center" />
        
        <div className="flex justify-between items-center w-full max-w-4xl mb-6">
          <div className="flex items-center">
            <h1 className="text-2xl font-medium text-gray-800">CV Review App</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User profile info */}
            <div className="hidden md:flex items-center text-right">
              <div>
                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="ml-3 bg-blue-500 text-white w-8 h-8 rounded-full flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors duration-200"
            >
              Logout
            </button>
            
            {/* Clear button (only show when there's content) */}
            {(files.length > 0 || results.length > 0) && (
              <button
                onClick={clearAll}
                className="text-red-500 hover:text-red-600 text-sm transition-colors duration-200 px-2 py-1 rounded hover:bg-red-50"
                disabled={loading}
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        
        <div className="flex justify-center w-full">
          <div
            {...getRootProps()}
            className={`border border-dashed p-3 rounded w-full max-w-md text-center cursor-pointer ${
              isDragActive 
                ? "border-blue-400 bg-blue-50" 
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-gray-600 text-sm">
              {isDragActive ? "Drop PDFs here" : "Drag & drop PDFs or click to select"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Up to 10 files, 5MB each</p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="flex justify-center w-full">
            <div className="mt-4 w-full max-w-md">
              <h2 className="text-sm font-medium text-gray-700 text-center">
                Files ({files.length}/10)
              </h2>
              <ul className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex justify-between items-center text-gray-700 bg-white p-2 rounded text-sm hover:bg-gray-50 transition-colors duration-200 border border-gray-100 hover:border-gray-200">
                    <span className="flex-1 truncate">
                      {file.name} <span className="text-gray-400 text-xs">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </span>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-400 hover:text-red-600 ml-2 px-1 rounded-full"
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
                className="mt-3 w-full bg-blue-500 text-white px-3 py-2 rounded text-sm disabled:bg-gray-400 hover:bg-blue-600 transition-colors duration-200"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : "Process CVs"}
              </button>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex justify-center w-full mt-5">
            <div className="w-full max-w-4xl">
              <h2 className="text-sm font-medium text-gray-700 mb-3 text-center">
                Results ({results.length} files)
              </h2>
              <div className="space-y-5 flex flex-col items-center">
                {results.map((result, index) => (
                  <div key={index} className="border border-gray-200 rounded-md bg-white p-4 w-full max-w-2xl shadow-sm hover:shadow-md transition-all duration-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-800 text-sm">
                          {result.name || result.fileName.replace(".pdf", "")}
                        </h3>
                        <p className="text-blue-500 text-xs">{result.category || "Software Developer"}</p>
                        <p className="text-gray-500 text-xs">
                          {result.experience || "Full Stack Developer"}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {result.fileName}
                      </span>
                    </div>
                    
                    {/* Contact Information */}
                    <div className="mt-2">
                      <h4 className="text-xs font-medium text-gray-500">
                        Contact
                      </h4>
                      <div className="bg-gray-50 p-2 rounded">
                        {result.email && (
                          <div className="text-xs mb-1">
                            <span className="text-gray-600">{result.email}</span>
                          </div>
                        )}
                        {result.phone && (
                          <div className="text-xs">
                            <span className="text-gray-600">{result.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Education */}
                    {result.education && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">
                          Education
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">{result.education}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Work Experience */}
                    {result.experience && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">
                          Experience
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">{result.experience}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Recommended Roles */}
                    {result.recommendedRoles && result.recommendedRoles.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">
                          Recommended Roles
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="flex flex-wrap gap-1">
                            {result.recommendedRoles.map((role, roleIndex) => (
                              <div
                                key={roleIndex}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-50 text-green-600"
                              >
                                <span>{role.role}</span>
                                {role.match && (
                                  <span className="ml-1 text-xs">
                                    {role.match}%
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Professional Summary */}
                    {result.summary && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">
                          Summary
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-600">{result.summary}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* Skills */}
                    {result.skills && result.skills.length > 0 && (
                      <div className="mt-2">
                        <h4 className="text-xs font-medium text-gray-500">
                          Skills
                        </h4>
                        <div className="bg-gray-50 p-2 rounded">
                          <div className="flex flex-wrap gap-1">
                            {result.skills.map((skill, skillIndex) => (
                              <span
                                key={skillIndex}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-600"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Page;
