"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export default function Navigation() {
  const pathname = usePathname();
  const { user, isSignedIn } = useUser();

  const isActive = (path) => {
    return pathname === path ? "text-blue-600" : "text-gray-600 hover:text-blue-500";
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-medium text-blue-600">CV Review App</h1>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link href="/" className={`inline-flex items-center px-1 pt-1 border-b-2 ${pathname === "/" ? "border-blue-500" : "border-transparent"} ${isActive("/")}`}>
                Home
              </Link>
              {isSignedIn && (
                <>
                  <Link href="/dashboard" className={`inline-flex items-center px-1 pt-1 border-b-2 ${pathname === "/dashboard" ? "border-blue-500" : "border-transparent"} ${isActive("/dashboard")}`}>
                    Dashboard
                  </Link>
                  <Link href="/uploads" className={`inline-flex items-center px-1 pt-1 border-b-2 ${pathname === "/uploads" ? "border-blue-500" : "border-transparent"} ${isActive("/uploads")}`}>
                    Uploads
                  </Link>
                </>
              )}
              <Link href="/about" className={`inline-flex items-center px-1 pt-1 border-b-2 ${pathname === "/about" ? "border-blue-500" : "border-transparent"} ${isActive("/about")}`}>
                About
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <div className="flex items-center space-x-2">
                <SignInButton mode="modal" redirectUrl="/dashboard">
                  <button className="px-3 py-1 rounded text-sm text-gray-700 hover:bg-gray-100">
                    Login
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" redirectUrl="/dashboard">
                  <button className="px-3 py-1 rounded text-sm bg-blue-500 text-white hover:bg-blue-600">
                    Register
                  </button>
                </SignUpButton>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
