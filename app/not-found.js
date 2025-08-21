"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <h2 className="mt-3 text-2xl font-semibold text-gray-800">Page Not Found</h2>
        <p className="mt-4 text-gray-600">Sorry, we couldn't find the page you're looking for.</p>
        
        <div className="mt-6">
          <Link href="/" className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
