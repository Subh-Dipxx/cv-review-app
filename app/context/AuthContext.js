"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setCookie, getCookie, deleteCookie } from 'cookies-next';

// Create context with initial null value
const AuthContext = createContext(null);

// Export the useAuth hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Auth Provider component
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const isLoggedInCookie = getCookie('isLoggedIn');
        const storedUser = localStorage.getItem("user");
        
        if (isLoggedInCookie && storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
          localStorage.removeItem("user");
          deleteCookie('isLoggedIn');
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Validate demo credentials
      if (email !== "user@example.com" || password !== "password123") {
        return { 
          success: false, 
          error: "Invalid credentials. Use: user@example.com / password123" 
        };
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockUser = { 
        id: 1, 
        email: email, 
        name: email.split('@')[0] 
      };
      
      setCookie('isLoggedIn', 'true', { maxAge: 4 * 60 * 60 }); // 4 hours
      localStorage.setItem("user", JSON.stringify(mockUser));
      
      setUser(mockUser);
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password) => {
    try {
      const mockUser = { id: Date.now(), email, name: email.split('@')[0] };
      
      setCookie('isLoggedIn', 'true', { maxAge: 4 * 60 * 60 });
      localStorage.setItem("user", JSON.stringify(mockUser));
      
      setUser(mockUser);
      router.push("/dashboard");
      
      return { success: true };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    deleteCookie('isLoggedIn');
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  const value = {
    user,
    isLoggedIn: !!user,
    login,
    logout,
    register,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
