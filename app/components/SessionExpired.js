"use client";

import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function SessionExpired() {
  const { logout } = useAuth();
  
  useEffect(() => {
    // Show a message and log the user out
    alert("Your session has expired. Please log in again.");
    logout();
  }, [logout]);
  
  return null; // This component doesn't render anything
}
