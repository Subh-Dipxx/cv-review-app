"use client";

import { AuthProvider } from "../context";
import Navigation from "./Navigation";

// Client wrapper with Navigation added
export default function ClientWrapper({ children }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <main className="flex-grow">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
}
