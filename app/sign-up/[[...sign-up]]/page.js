"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-[calc(100vh-200px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">CV Review Platform</h1>
          <p className="text-gray-600 mt-2">AI-Powered Candidate Analysis</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 lg:p-10 border border-gray-200">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Get started with your free account</p>
          </div>

          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none w-full bg-transparent",
                header: "hidden",
                socialButtonsBlockButton: "w-full bg-white border-2 border-gray-300 hover:bg-gray-50 hover:border-blue-500 transition-all duration-200 rounded-xl py-3 font-semibold",
                socialButtonsBlockButtonText: "text-gray-700 font-semibold",
                formButtonPrimary: "w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl py-3.5",
                footerActionLink: "text-blue-600 hover:text-purple-600 font-semibold",
                formFieldInput: "w-full border-2 border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 rounded-xl py-3 px-4 text-gray-900",
                formFieldLabel: "text-gray-800 font-semibold mb-2",
                dividerLine: "bg-gray-300",
                dividerText: "text-gray-500 px-4",
                footer: "hidden",
              }
            }}
          />

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-blue-600 hover:text-purple-600 font-bold">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Secure authentication by Clerk</span>
          </div>
        </div>

      </div>
    </div>
  );
}
