'use client';

import React from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">CV Review App</h1>
        <p className="text-gray-600 mb-6">
          AI-powered CV categorization and analysis tool
        </p>
        
        <SignedOut>
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <SignInButton mode="modal">
            <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition duration-200 ease-in-out transform hover:scale-105">
              Sign In to Continue
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div className="space-y-3">
            <Link 
              href="/dashboard" 
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
            >
              Go to Dashboard
            </Link>
            <Link 
              href="/process" 
              className="block w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition"
            >
              Process CVs
            </Link>
            <Link 
              href="/resumes" 
              className="block w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition"
            >
              Browse Resumes
            </Link>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}