# Fix and start script for Next.js
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Create minimal required files
Write-Host "Checking critical Next.js files..." -ForegroundColor Yellow

# Create a clean next.config.js
Write-Host "Creating clean next.config.js..." -ForegroundColor Yellow
@"
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
}

module.exports = nextConfig
"@ | Out-File -FilePath "next.config.js" -Encoding utf8

# Ensure we have a proper tailwind config
Write-Host "Checking tailwind.config.js..." -ForegroundColor Yellow
if (Test-Path "tailwind.config.js") {
    Copy-Item "tailwind.config.js" -Destination "tailwind.config.js.backup" -Force
}

@"
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)"],
        mono: ["var(--font-geist-mono)"],
      },
    },
  },
  plugins: [],
}
"@ | Out-File -FilePath "tailwind.config.js" -Encoding utf8

# Create proper PostCSS config
Write-Host "Creating clean postcss.config.mjs..." -ForegroundColor Yellow
@"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
"@ | Out-File -FilePath "postcss.config.mjs" -Encoding utf8

# Try running with minimal mode
Write-Host "Starting Next.js in minimal mode..." -ForegroundColor Green
npm run dev
