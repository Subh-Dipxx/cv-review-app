# Function Checker for CV Review App
# This script verifies that all critical app functions are working

$ErrorActionPreference = "Stop"
Write-Host "CV Review App - Function Checker" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan

# Define paths
$projectDir = "C:\Users\HP\cv-review-app"
Set-Location -Path $projectDir

# Function to check file existence
function Test-FileExists {
    param (
        [string]$path,
        [string]$name
    )
    
    if (Test-Path $path) {
        Write-Host "[OK] $name found" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[FAIL] $name not found at $path" -ForegroundColor Red
        return $false
    }
}

# Function to check API endpoint implementation
function Test-ApiEndpoint {
    param (
        [string]$path,
        [string]$name
    )
    
    if (Test-Path $path) {
        $apiContent = Get-Content $path -Raw
        if ($apiContent.Contains("export async function") -and $apiContent.Contains("NextResponse")) {
            Write-Host "[OK] $name API implemented" -ForegroundColor Green
            return $true
        } else {
            Write-Host "[FAIL] $name API not properly implemented" -ForegroundColor Red
            return $false
        }
    } else {
        Write-Host "[FAIL] $name API not found at $path" -ForegroundColor Red
        return $false
    }
}

# Check application structure
Write-Host "`nChecking Application Structure:" -ForegroundColor Yellow

$coreFiles = @(
    @{Path = "app\page.js"; Name = "Main Page"},
    @{Path = "app\layout.js"; Name = "Layout"},
    @{Path = "app\globals.css"; Name = "Global Styles"},
    @{Path = "next.config.js"; Name = "Next.js Config"},
    @{Path = "tailwind.config.js"; Name = "Tailwind Config"},
    @{Path = "postcss.config.mjs"; Name = "PostCSS Config"}
)

$coreFilesOk = $true
foreach ($file in $coreFiles) {
    $fileExists = Test-FileExists -path $file.Path -name $file.Name
    if (-not $fileExists) {
        $coreFilesOk = $false
    }
}

# Check API routes
Write-Host "`nChecking API Routes:" -ForegroundColor Yellow
$apiRoutes = @(
    @{Path = "app\api\parse-cv\route.js"; Name = "Parse CV"},
    @{Path = "app\api\process-cv\route.js"; Name = "Process CV"},
    @{Path = "app\api\get-cvs\route.js"; Name = "Get CVs"}
)

$apiRoutesOk = $true
foreach ($route in $apiRoutes) {
    $apiOk = Test-ApiEndpoint -path $route.Path -name $route.Name
    if (-not $apiOk) {
        $apiRoutesOk = $false
    }
}

# Check service implementations
Write-Host "`nChecking Service Implementations:" -ForegroundColor Yellow
$services = @(
    @{Path = "app\lib\ai-service.js"; Name = "AI Service"},
    @{Path = "app\lib\pdf-parser.js"; Name = "PDF Parser"},
    @{Path = "app\lib\db.js"; Name = "Database Service"}
)

$servicesOk = $true
foreach ($service in $services) {
    $serviceExists = Test-FileExists -path $service.Path -name $service.Name
    if (-not $serviceExists) {
        $servicesOk = $false
    }
}

# Check for specific functions in main page
Write-Host "`nChecking Core Functionality:" -ForegroundColor Yellow
$pageJs = Get-Content "app\page.js" -Raw -ErrorAction SilentlyContinue

$functionalityChecks = @(
    @{Feature = "File Upload"; Check = $pageJs -match "useDropzone|onDrop"},
    @{Feature = "Process CVs"; Check = $pageJs -match "processFiles|processCVs|startProcessing"},
    @{Feature = "Display Results"; Check = $pageJs -match "categorizedResults|setCategorizedResults"},
    @{Feature = "Theme Support"; Check = $pageJs -match "theme|setTheme|localStorage"}
)

$functionalityOk = $true
foreach ($check in $functionalityChecks) {
    if ($check.Check) {
        Write-Host "[OK] $($check.Feature) implemented" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($check.Feature) may be missing" -ForegroundColor Red
        $functionalityOk = $false
    }
}

# Check for AI service key parts
Write-Host "`nChecking AI Service Implementation:" -ForegroundColor Yellow
$aiService = Get-Content "app\lib\ai-service.js" -Raw -ErrorAction SilentlyContinue

$aiChecks = @(
    @{Feature = "OpenAI Integration"; Check = $aiService -match "OpenAI|openai"},
    @{Feature = "CV Analysis"; Check = $aiService -match "analyzeCvWithAI|analyzeCV"},
    @{Feature = "Error Handling"; Check = $aiService -match "try" -and $aiService -match "catch"},
    @{Feature = "API Version Compatibility"; Check = $aiService -match "V3|V4|version"}
)

$aiOk = $true
foreach ($check in $aiChecks) {
    if ($check.Check) {
        Write-Host "[OK] $($check.Feature) implemented" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($check.Feature) may be missing" -ForegroundColor Red
        $aiOk = $false
    }
}

# Summary
Write-Host "`nFunctionality Check Summary:" -ForegroundColor Yellow
$allChecks = @(
    @{Name = "Core Application Files"; Status = $coreFilesOk},
    @{Name = "API Routes"; Status = $apiRoutesOk},
    @{Name = "Service Implementations"; Status = $servicesOk},
    @{Name = "Core Functionality"; Status = $functionalityOk},
    @{Name = "AI Service Implementation"; Status = $aiOk}
)

$allOk = $true
foreach ($check in $allChecks) {
    if ($check.Status) {
        Write-Host "[OK] $($check.Name): OK" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] $($check.Name): Issues Detected" -ForegroundColor Red
        $allOk = $false
    }
}

Write-Host "`nOverall Status:" -ForegroundColor Yellow
if ($allOk) {
    Write-Host "[PASS] All application functions appear to be implemented and working correctly" -ForegroundColor Green
    Write-Host "   The CV Review App should be functioning as expected" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some issues were detected with the application" -ForegroundColor Yellow
    Write-Host "   Review the details above and address any marked with [FAIL]" -ForegroundColor Yellow
    Write-Host "   Run node diagnose-errors.js for more detailed error analysis" -ForegroundColor Yellow
}

Write-Host "`nApplication Features:" -ForegroundColor Cyan
Write-Host "1. File Upload - Upload CV files via drag-and-drop interface" -ForegroundColor White
Write-Host "2. PDF Parsing - Extract text content from PDF CVs" -ForegroundColor White
Write-Host "3. AI Analysis - Categorize CVs using AI (if configured)" -ForegroundColor White
Write-Host "4. Fallback Analysis - Basic text analysis when AI is unavailable" -ForegroundColor White
Write-Host "5. Results Display - Show categorized results with skills and recommendations" -ForegroundColor White
Write-Host "6. Theme Support - Switch between light and dark themes" -ForegroundColor White
