"use client";

import { AuthProvider } from "../context/AuthContext";
import Navigation from "./Navigation";
import SessionManager from "./SessionManager";

export default function ClientLayout({ children }) {
  return (
    <AuthProvider>
      <SessionManager />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}

