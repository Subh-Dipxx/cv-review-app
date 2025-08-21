// filepath: c:\Users\HP\cv-review-app\app\api\debug\route.js
import { NextResponse } from "next/server";
import { validateDbConnection } from "../../lib/db";
import fs from 'fs';
import path from 'path';
import os from 'os';

export async function GET() {
  console.log("🔎 Starting server diagnostics...");
  
  // System health check
  const systemInfo = {
    platform: os.platform(),
    cpuCores: os.cpus().length,
    totalMemoryGB: Math.round(os.totalmem() / (1024 * 1024 * 1024)),
    freeMemoryGB: Math.round(os.freemem() / (1024 * 1024 * 1024)),
    uptime: Math.round(os.uptime() / 60) + " minutes"
  };
  
  // Project structure verification
  const projectRoot = path.resolve(".");
  const criticalFiles = [
    "app/page.js", 
    "app/layout.js",
    "app/lib/db.js",
    "next.config.js"
  ];
  
  const missingFiles = [];
  for (const file of criticalFiles) {
    if (!fs.existsSync(path.join(projectRoot, file))) {
      missingFiles.push(file);
    }
  }
  
  // Environment variables check
  const envCheck = {
    nodeEnv: process.env.NODE_ENV || "not set",
    dbConfigured: Boolean(process.env.DB_HOST && process.env.DB_USER),
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };
  
  // Database connection test
  const dbConnected = await validateDbConnection();
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    status: "Diagnostics completed",
    systemHealth: systemInfo,
    projectStructure: {
      complete: missingFiles.length === 0,
      missingFiles: missingFiles.length > 0 ? missingFiles : undefined
    },
    environment: envCheck,
    database: {
      connected: dbConnected,
      resolution: dbConnected ? undefined : "Check MySQL service and credentials"
    },
    nextSteps: !dbConnected ? [
      "1. Verify MySQL is running (services.msc)",
      "2. Check database credentials in .env.local",
      "3. Try creating the database manually: CREATE DATABASE cv_review;",
      "4. Restart the application: npm run dev"
    ] : undefined
  });
}