"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import AuthGuard from "../components/AuthGuard";
import { toast, Toaster } from "react-hot-toast";
import Link from "next/link";

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    darkMode: false,
    autoSave: true,
    language: "en"
  });

  // Load settings when component mounts
  useEffect(() => {
    // In a real app, you'd fetch this from an API
    const savedSettings = localStorage.getItem("userSettings");
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error("Error loading settings:", e);
      }
    }
  }, []);

  const handleToggle = (setting) => {
    setSettings((prev) => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      // Save settings to localStorage
      localStorage.setItem("userSettings", JSON.stringify(newSettings));
      return newSettings;
    });
    
    toast.success(`${setting.charAt(0).toUpperCase() + setting.slice(1).replace(/([A-Z])/g, ' $1')} ${settings[setting] ? 'disabled' : 'enabled'}`);
  };
  
  const handleLanguageChange = (e) => {
    const value = e.target.value;
    setSettings((prev) => {
      const newSettings = { ...prev, language: value };
      localStorage.setItem("userSettings", JSON.stringify(newSettings));
      return newSettings;
    });
    
    toast.success(`Language set to ${getLanguageName(value)}`);
  };
  
  const getLanguageName = (code) => {
    const languages = {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      zh: "Chinese"
    };
    return languages[code] || code;
  };

  return (
    <AuthGuard>
      <div className="py-6 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <Toaster position="top-center" />
        
        <div className="md:flex md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your application preferences
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {/* Notifications Section */}
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Email Notifications</h3>
                    <p className="text-xs text-gray-500">
                      Receive email notifications when new CVs are processed
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle("emailNotifications")}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      settings.emailNotifications ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span className="sr-only">Toggle email notifications</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        settings.emailNotifications ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Appearance Section */}
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Appearance</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Dark Mode</h3>
                    <p className="text-xs text-gray-500">
                      Enable dark mode for the application interface
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle("darkMode")}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      settings.darkMode ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span className="sr-only">Toggle dark mode</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        settings.darkMode ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Language Section */}
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Language</h2>
              <div className="mt-4">
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Select Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={settings.language}
                  onChange={handleLanguageChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
            </div>
            
            {/* Other Settings Section */}
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Other Settings</h2>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Auto-save drafts</h3>
                    <p className="text-xs text-gray-500">
                      Automatically save your work in progress
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle("autoSave")}
                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                      settings.autoSave ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  >
                    <span className="sr-only">Toggle auto-save</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${
                        settings.autoSave ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Security Section */}
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900">Security</h2>
              <div className="mt-4 space-y-4">
                <Link 
                  href="/change-password" 
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Change Password
                </Link>
                
                <div className="pt-2">
                  <Link 
                    href="/security" 
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    View all security settings →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
