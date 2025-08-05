"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import toast, { Toaster } from "react-hot-toast";

function Page() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

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
      console.log(`Starting to process ${files.length} files`);
      
      const formData = new FormData();
      files.forEach((file, index) => {
        console.log(`Adding file ${index + 1}: ${file.name}, size: ${file.size}, type: ${file.type}`);
        formData.append("files", file);
      });
      
      console.log("Sending parse request...");
      const parseResponse = await fetch("/api/parse-cv", {
        method: "POST",
        body: formData,
      });
      
      console.log(`Parse response status: ${parseResponse.status}`);
      
      if (!parseResponse.ok) {
        let errorMessage = `Parse failed with status ${parseResponse.status}`;
        try {
          const errorData = await parseResponse.json();
          errorMessage = errorData.error || errorMessage;
          console.error("Parse error details:", errorData);
        } catch (jsonError) {
          console.error("Could not parse error response as JSON:", jsonError);
          const errorText = await parseResponse.text();
          console.error("Error response text:", errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const parseData = await parseResponse.json();
      console.log("Parse data received:", parseData);
      
      if (parseData.error) {
        throw new Error(parseData.error);
      }

      if (!parseData.results || !Array.isArray(parseData.results)) {
        throw new Error("Invalid parse response format");
      }

      toast.loading("Categorizing CVs...", { id: "processing" });
      console.log("Sending process request...");

      const processResponse = await fetch("/api/process-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: parseData.results }),
      });
      
      console.log(`Process response status: ${processResponse.status}`);
      
      if (!processResponse.ok) {
        let errorMessage = `Process failed with status ${processResponse.status}`;
        try {
          const errorData = await processResponse.json();
          errorMessage = errorData.error || errorMessage;
          console.error("Process error details:", errorData);
        } catch (jsonError) {
          const errorText = await processResponse.text();
          console.error("Process error text:", errorText);
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      
      const processData = await processResponse.json();
      console.log("Process data received:", processData);
      
      if (processData.error) {
        throw new Error(processData.error);
      }

      const categorizedResults = processData.categorized || [];
      setResults(categorizedResults);
      toast.success(`Successfully processed ${categorizedResults.length} files!`, { id: "processing" });
      
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
                <h3 className="font-bold text-gray-800 truncate" title={result.fileName}>
                  {result.fileName}
                </h3>
                <p className="mt-2">
                  <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    {result.category}
                  </span>
                </p>
                <p className="mt-2 text-gray-600 text-sm line-clamp-3">
                  {result.summary}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Page;