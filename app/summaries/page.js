"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Toaster, toast } from "react-hot-toast";

export default function SummariesPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchSummaries() {
      try {
        console.log("Fetching summaries from API...");
        const response = await fetch("/api/get-summaries");
        console.log("API response status:", response.status);
        
        if (!response.ok) {
          // Try to get more details about the error
          let errorDetails = "";
          try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorData.error || "";
            console.error("Error details from API:", errorData);
          } catch (e) {
            // If not JSON, try to get text
            errorDetails = await response.text();
            console.error("Raw error response:", errorDetails);
          }
          
          throw new Error(`API error (${response.status}): ${errorDetails}`);
        }
        
        // Parse the JSON response
        const data = await response.json();
        console.log("Summaries fetched successfully:", data);
        
        if (!data.summaries) {
          console.error("API response missing summaries array:", data);
          throw new Error("Invalid API response format");
        }
        
        setSummaries(data.summaries);
        if (data.summaries.length === 0) {
          toast.info("No summaries found. Process some CVs first.");
        }
      } catch (error) {
        console.error("Error fetching summaries:", error);
        setError(error.message);
        toast.error(`Failed to load summaries: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchSummaries();
  }, []);

  // Helper function to get color based on match percentage
  const getMatchColor = (percentage) => {
    if (percentage >= 80) return "bg-green-100 text-green-800";
    if (percentage >= 60) return "bg-blue-100 text-blue-800";
    if (percentage >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-gray-100 text-gray-800";
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">CV Summaries</h1>
          <Link 
            href="/" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Upload
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <p className="text-gray-600">Loading summaries...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-red-500 mb-4">Error: {error}</p>
            <Link href="/" className="text-blue-500 hover:underline">
              Return to upload page
            </Link>
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg shadow">
            <p className="text-gray-600">No CV summaries found in the database.</p>
            <Link href="/" className="text-blue-500 hover:underline block mt-4">
              Upload CVs to analyze
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {summaries.map((summary) => (
              <div key={summary.id || Math.random()} className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between mb-3">
                  <h2 className="font-bold text-xl text-gray-800">
                    {summary.name || summary.fileName || "Unnamed CV"}
                  </h2>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {summary.category || "Uncategorized"}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-4">
                  {summary.createdAt ? new Date(summary.createdAt).toLocaleDateString() : "Unknown date"}
                </p>
                
                {summary.email && (
                  <p className="text-gray-700 text-sm mb-2">
                    <span className="font-medium">Email:</span> {summary.email}
                  </p>
                )}
                
                {summary.collegeName && (
                  <p className="text-gray-700 text-sm mb-4">
                    <span className="font-medium">Education:</span> {summary.collegeName}
                  </p>
                )}
                
                <div className="mt-3">
                  <h3 className="font-medium text-gray-700 mb-1">Summary:</h3>
                  <p className="text-gray-600 text-sm">
                    {summary.professionalSummary || summary.summary || "No summary available."}
                  </p>
                </div>
                
                {summary.recommendedRoles && summary.recommendedRoles.length > 0 && (
                  <div className="mt-3">
                    <h3 className="font-medium text-gray-700 mb-1">Recommended Roles:</h3>
                    <div className="space-y-2 mt-1">
                      {summary.recommendedRoles.map((role, i) => (
                        <div key={i} className="flex items-center">
                          <span className={`px-2 py-1 rounded text-xs mr-2 ${
                            getMatchColor(role?.percentage || 0)
                          }`}>
                            {role?.name || "Unknown Role"}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${getMatchColor(role?.percentage || 0)}`}
                              style={{ width: `${role?.percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-xs font-medium text-gray-700">
                            {role?.percentage || 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-4">File: {summary.fileName || "Unknown"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

