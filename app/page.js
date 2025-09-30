'use client';

import React, { useEffect } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn, openSignUp } = useClerk();
  const router = useRouter();

  const handleSignUp = () => {
    openSignUp({
      afterSignUpUrl: '/dashboard',
    });
  };

  const handleSignIn = () => {
    openSignIn({
      afterSignInUrl: '/dashboard',
    });
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-gray-900">CV Review Pro</span>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              CV Review Pro
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Upload CVs and get AI-powered analysis
            </p>
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleSignUp}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200 cursor-pointer"
              >
                Start Now
              </button>
              
              <button 
                onClick={handleSignIn}
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg font-medium hover:bg-gray-50 transition duration-200 cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}