"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function AuthGuard({ children }) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();
  const [sessionWarned, setSessionWarned] = useState(false);

  useEffect(() => {
    // Only redirect after authentication state is loaded
    if (!loading && !isLoggedIn) {
      router.push("/login");
    }
    
    // Check for session expiration
    const checkSessionExpiry = () => {
      if (!isLoggedIn) return;
      
      const sessionExpiry = localStorage.getItem("sessionExpiry");
      if (!sessionExpiry) return;
      
      const expiryTime = parseInt(sessionExpiry);
      const currentTime = new Date().getTime();
      const timeLeft = expiryTime - currentTime;
      
      // If less than 10 minutes left, warn user
      if (timeLeft > 0 && timeLeft < 10 * 60 * 1000 && !sessionWarned) {
        toast.warning(
          "Your session will expire soon. Stay active to keep your session.",
          { duration: 10000 }
        );
        setSessionWarned(true);
      }
      
      // Reset warning flag if more than 15 minutes left
      if (timeLeft > 15 * 60 * 1000 && sessionWarned) {
        setSessionWarned(false);
      }
    };
    
    // Check on mount and every minute
    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 60000);
    
    return () => clearInterval(interval);
  }, [isLoggedIn, loading, router, sessionWarned]);

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If not authenticated and not loading, the useEffect will redirect
  // If authenticated, render the children
  return isLoggedIn ? <>{children}</> : null;
}
