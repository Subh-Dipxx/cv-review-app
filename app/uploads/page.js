"use client";

import { useState, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { useDropzone } from "react-dropzone";
import AuthGuard from "../components/AuthGuard";

export default function Uploads() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Fetch previously uploaded files
  useEffect(() => {
    const fetchUploadedFiles = async () => {
      setLoading(true);
      try {
        // In a real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for demo
        setUploadedFiles([
          {
            id: 1,
            name: "John_Smith_Resume.pdf",
            size: 2.4, // MB
            uploadDate: "2025-08-10T14:30:00",
            status: "Processed"
          },
          {
            id: 2,
            name: "Sarah_Johnson_CV.pdf",
            size: 1.8, // MB
            uploadDate: "2025-08-15T09:45:00",
            status: "Processed"
          },
          {
            id: 3,
            name: "Michael_Brown_Resume.pdf",
            size: 3.2, // MB
            uploadDate: "2025-08-17T16:20:00",
            status: "Processing"
          }
        ]);
      } catch (error) {
        console.error("Error fetching uploads:", error);
        toast.error("Failed to load your uploaded files");
      } finally {
        setLoading(false);
      }
    };
    
    fetchUploadedFiles();
  }, []);

  // Handle file drop
  const onDrop = (acceptedFiles) => {
    const pdfFiles = acceptedFiles.filter(
      (file) => file.type === "application/pdf"
    );
    
    if (pdfFiles.length === 0) {
      toast.error("Please select only PDF files!");
      return;
    }
    
    if (pdfFiles.length + files.length > 10) {
      toast.error("You can upload a maximum of 10 PDFs at once!");
      return;
    }
    
    setFiles([...files, ...pdfFiles]);
    toast.success(`${pdfFiles.length} PDF(s) added to queue!`);
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: 5 * 1024 * 1024, // 5MB
    multiple: true,
  });

  // Remove file from queue
  const removeFile = (index) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    toast.success("File removed from queue!");
  };

  // Upload files
  const uploadFiles = async () => {
    if (files.length === 0) {
      toast.error("Please add files to upload!");
      return;
    }
    
    setUploading(true);
    
    try {
      toast.loading("Uploading files...", { id: "uploading" });
      
      // In a real app, this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful upload
      const newUploadedFiles = files.map((file, index) => ({
        id: uploadedFiles.length + index + 1,
        name: file.name,
        size: (file.size / 1024 / 1024).toFixed(1),
        uploadDate: new Date().toISOString(),
        status: "Processing"
      }));
      
      setUploadedFiles([...newUploadedFiles, ...uploadedFiles]);
      setFiles([]);
      
      toast.success(`${newUploadedFiles.length} file(s) uploaded successfully!`, { id: "uploading" });
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files. Please try again.", { id: "uploading" });
    } finally {
      setUploading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Delete uploaded file
  const deleteUploadedFile = async (id) => {
    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setUploadedFiles(uploadedFiles.filter(file => file.id !== id));
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file. Please try again.");
    }
  };

  // View file details (in a real app, this would navigate to details page)
  const viewFileDetails = (id) => {
    toast.success("File details feature coming soon!");
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="inline-flex items-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="p-4 sm:p-6 md:p-8">
        <Toaster position="top-center" />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Upload CVs</h1>
          <p className="text-gray-600">Upload and manage your CV files</p>
        </div>
        
        {/* Upload Area */}
        <div className="bg-white shadow rounded-lg mb-6 p-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4">Upload New Files</h2>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-2">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-600">
                {isDragActive
                  ? "Drop PDFs here..."
                  : "Drag & drop PDF files here, or click to select files"}
              </p>
              <p className="text-xs text-gray-500">PDF files only, max 5MB each</p>
            </div>
          </div>
          
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Files ({files.length})</h3>
              <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                {files.map((file, index) => (
                  <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                    <div className="w-0 flex-1 flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="ml-2 flex-1 w-0 truncate">{file.name}</span>
                    </div>
                    <div className="ml-4 flex items-center space-x-4">
                      <span className="text-gray-500 text-xs">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                        type="button"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              
              <div className="mt-4">
                <button
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>Upload Files</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Previously Uploaded Files */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-800">Your Uploaded Files</h2>
            <p className="mt-1 text-sm text-gray-500">A list of all the files you've uploaded</p>
          </div>
          
          {loading ? (
            <div className="px-4 py-12 text-center">
              <svg className="animate-spin mx-auto h-6 w-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-2 text-sm text-gray-500">Loading your files...</p>
            </div>
          ) : (
            <>
              {uploadedFiles.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No files uploaded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Size
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Upload Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {uploadedFiles.map((file) => (
                        <tr key={file.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{file.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{file.size} MB</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(file.uploadDate)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              file.status === "Processed" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {file.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                              onClick={() => viewFileDetails(file.id)} 
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              View
                            </button>
                            <button 
                              onClick={() => deleteUploadedFile(file.id)} 
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}
