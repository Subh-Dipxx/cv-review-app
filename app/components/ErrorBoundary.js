"use client";

import { useState } from 'react';

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  if (hasError) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-700">{error?.message || "Unknown error occurred"}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Reload page
        </button>
      </div>
    );
  }

  return (
    <div onError={(error) => {
      console.error("Caught error:", error);
      setError(error);
      setHasError(true);
    }}>
      {children}
    </div>
  );
}
