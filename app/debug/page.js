"use client";

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [status, setStatus] = useState({ loading: true, error: null, info: null });

  useEffect(() => {
    async function checkSystem() {
      try {
        setStatus(prev => ({ ...prev, loading: true }));
        
        // Basic environment check (client-side)
        const clientInfo = {
          time: new Date().toISOString(),
          browser: navigator.userAgent,
          clientSide: true
        };
        
        setStatus({
          loading: false,
          error: null,
          info: clientInfo
        });
      } catch (error) {
        console.error("Debug check failed:", error);
        setStatus({ 
          loading: false, 
          error: error.message || "Unknown error occurred", 
          info: null 
        });
      }
    }
    
    checkSystem();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Next.js Diagnostic Page</h1>
      
      {status.loading ? (
        <p>Loading diagnostics...</p>
      ) : status.error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
          <p className="font-mono">{status.error}</p>
        </div>
      ) : (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h2 className="text-xl font-bold text-green-600 mb-2">Client-Side Check Passed</h2>
          <pre className="bg-black text-green-400 p-4 rounded overflow-auto">
            {JSON.stringify(status.info, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-2">Troubleshooting Steps</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>Check database connection settings in <code>.env.local</code></li>
          <li>Verify MySQL server is running</li>
          <li>Look for syntax errors in API routes</li>
          <li>Check for port conflicts (default: 3000)</li>
        </ul>
      </div>
    </div>
  );
}
