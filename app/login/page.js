"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CV Review Platform</h1>
          <p className="text-gray-600">Sign in to access your account</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg p-8">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none w-full",
                headerTitle: "text-2xl font-bold",
                headerSubtitle: "text-gray-600",
                socialButtonsBlockButton: "bg-white border-gray-300 hover:bg-gray-50",
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                footerActionLink: "text-blue-600 hover:text-blue-700"
              }
            }}
            routing="path"
            path="/login"
            signUpUrl="/register"
            afterSignInUrl="/dashboard"
            redirectUrl="/dashboard"
          />
        </div>
        
        <p className="text-center mt-6 text-sm text-gray-600">
          Don't have an account?{" "}
          <a href="/register" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
}
