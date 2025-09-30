'use client';

import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Clerk Test Page</h1>
        <SignedOut>
          <SignInButton>
            <button className="bg-blue-600 text-white px-4 py-2 rounded">
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <div>
            <p>You are signed in!</p>
            <UserButton />
          </div>
        </SignedIn>
      </div>
    </div>
  );
}