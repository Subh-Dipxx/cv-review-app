"use client";

import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { setCookie } from 'cookies-next';

export default function SessionManager() {
  const { isLoggedIn } = useAuth();
  
  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Function to refresh the session
    const refreshSession = () => {
      // Only refresh if the user is logged in
      if (isLoggedIn) {
        // Extend cookie expiration
        setCookie('isLoggedIn', 'true', { maxAge: 4 * 60 * 60 }); // 4 hours
        
        // Update session expiry in localStorage
        const expiryTime = new Date().getTime() + (4 * 60 * 60 * 1000);
        localStorage.setItem("sessionExpiry", expiryTime.toString());
      }
    };
    
    // Set up event listeners for user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Debounce function to prevent too many refreshes
    let timeout;
    const debounceRefresh = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(refreshSession, 1000); // 1 second debounce
    };
    
    // Add all event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, debounceRefresh);
    });
    
    // Clean up event listeners
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, debounceRefresh);
      });
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoggedIn]);
  
  // This component doesn't render anything
  return null;
}
