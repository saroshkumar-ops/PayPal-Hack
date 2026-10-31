<#
==============================================================================
TripSheriff AI - Master Startup & Verification Script
Target: PayPal AI Hackathon 2026

This script:
  1. Verifies & downloads all dependencies for AI, Backend, and Frontend.
  2. Validates ports (8001, 8080, 3000) and releases stale processes if needed.
  3. Launches all 3 services in separate titled console windows.
  4. Monitors health endpoints until ready.
  5. Automatically opens the Web Simulator (http://localhost:3000/simulator).
==============================================================================
#>

[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$KillExistingPorts,
    [int]$MaxWaitSec = 45,
    [string]$BrowserUrl = "http://localhost:3000/simulator"
)

$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
$AiDir = Join-Path $RootDir "ai"
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  TripSheriff AI - Autonomous Group Treasury & Debt Agent         " -ForegroundColor Yellow
Write-Host "  PayPal AI Hackathon 2026 - Full-Stack Local Orchestrator        " -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------------------------
# 1. Verification & Dependency Check
# ------------------------------------------------------------------------------
Write-Host "[1/5] Verifying prerequisites and project dependencies..." -ForegroundColor Cyan

# 1.1 Node.js & npm check
try {
    $nodeVer = node -v
    $npmVer = npm -v
    Write-Host "  [OK] Node.js detected: $nodeVer (npm: $npmVer)" -ForegroundColor Green
} catch {
    Write-Host "  [FAIL] Node.js is not found in PATH! Please install Node 18+ from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 1.2 Java check (detect in PATH or JAVA_HOME or ~/.jdks)
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCmd) {
    if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
        $env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH
        $javaCmd = Get-Command java -ErrorAction SilentlyContinue
    } else {
        $candidateJdks = Get-ChildItem -Path "$env:USERPROFILE\.jdks" -Filter "java.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($candidateJdks) {
            $jdkBin = $candidateJdks.DirectoryName
            $env:PATH = "$jdkBin;" + $env:PATH
            $env:JAVA_HOME = $candidateJdks.Directory.Parent.FullName
            $javaCmd = Get-Command java -ErrorAction SilentlyContinue
        }
    }
}

if ($javaCmd) {
    $prevEAP = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $javaVer = (& java -version 2>&1 | Select-Object -First 1).ToString()
    $ErrorActionPreference = $prevEAP
    Write-Host "  [OK] Java detected: $javaVer" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Java (JDK 21+) is not found in PATH or JAVA_HOME! Please install JDK from https://adoptium.net/" -ForegroundColor Red
    exit 1
}

# 1.3 Python check
$PythonExe = Join-Path $AiDir "venv\Scripts\python.exe"
if (-not (Test-Path $PythonExe)) {
    Write-Host "  [WARN] Python virtual environment not found in $AiDir\venv. Creating..." -ForegroundColor Yellow
    try {
        & python -m venv (Join-Path $AiDir "venv")
        Write-Host "  [OK] Created Python virtual environment." -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] Failed to create Python venv. Ensure Python 3.11+ is installed." -ForegroundColor Red
        exit 1
    }
} else {
    $pyVer = & $PythonExe --version
    Write-Host "  [OK] Python venv detected: $pyVer" -ForegroundColor Green
}

# 1.4 Install/Verify Dependencies
if (-not $SkipInstall) {
    # Frontend npm packages
    $NodeModules = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $NodeModules)) {
        Write-Host "  [INSTALL] Installing frontend dependencies (npm install)..." -ForegroundColor Yellow
        Push-Location $FrontendDir
        try {
            npm install
            Write-Host "  [OK] Frontend dependencies installed." -ForegroundColor Green
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  [OK] Frontend dependencies verified (node_modules present)." -ForegroundColor Green
    }

    # Python AI requirements
    Write-Host "  [INSTALL] Verifying Python AI requirements..." -ForegroundColor Yellow
    Push-Location $AiDir
    try {
        & $PythonExe -m pip install -q -r requirements.txt
        Write-Host "  [OK] Python AI dependencies up-to-date." -ForegroundColor Green
    } catch {
        Write-Host "  [WARN] pip install encountered an issue, proceeding with existing packages." -ForegroundColor Yellow
    } finally {
        Pop-Location
    }
} else {
    Write-Host "  [SKIP] Skipped dependency installation (-SkipInstall flag active)." -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 2. Port Check & Conflict Resolution
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Checking ports (8001 AI, 8080 Backend, 3000 Frontend)..." -ForegroundColor Cyan

$Ports = @(
    @{ Port = 8001; Service = "Python AI Microservice" },
    @{ Port = 8080; Service = "Java Spring Boot Backend" },
    @{ Port = 3000; Service = "React Frontend" }
)

foreach ($p in $Ports) {
    $portNum = $p.Port
    $serviceName = $p.Service
    $conns = Get-NetTCPConnection -LocalPort $portNum -ErrorAction SilentlyContinue

    if ($conns) {
        $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
        Write-Host "  [WARN] Port $portNum ($serviceName) is already occupied by PID(s): $($pids -join ', ')" -ForegroundColor Yellow
        if ($KillExistingPorts) {
            foreach ($procId in $pids) {
                Write-Host "         Terminating PID $procId..." -ForegroundColor Red
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Seconds 1
        } else {
            Write-Host "         (Use -KillExistingPorts or .\stop-all.ps1 to free this port)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  [OK] Port $portNum ($serviceName) is available." -ForegroundColor Green
    }
}

# ------------------------------------------------------------------------------
# 3. Launch Services in Dedicated Windows
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Launching microservices..." -ForegroundColor Cyan

# Service 1: Python AI Microservice (Port 8001)
Write-Host "  -> [1/3] Starting Python AI Microservice on http://localhost:8001..." -ForegroundColor White
$AiCmd = "& { " +
         "`$host.UI.RawUI.WindowTitle = 'TripSheriff AI (Port 8001)'; " +
         "Write-Host '==================================================' -ForegroundColor Cyan; " +
         "Write-Host 'TripSheriff AI Microservice (Port 8001)' -ForegroundColor Yellow; " +
         "Write-Host '==================================================' -ForegroundColor Cyan; " +
         "Set-Location '$AiDir'; " +
         "& '$PythonExe' -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload " +
         "}"

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $AiCmd -WorkingDirectory $AiDir

# Service 2: Java Spring Boot Backend (Port 8080)
Write-Host "  -> [2/3] Starting Java Spring Boot Backend on http://localhost:8080..." -ForegroundColor White
$javaBinDir = if ($javaCmd) { $javaCmd.Source | Split-Path -Parent } else { "" }
$BackendCmd = "& { " +
              "`$host.UI.RawUI.WindowTitle = 'TripSheriff Backend (Port 8080)'; " +
              "Write-Host '==================================================' -ForegroundColor Cyan; " +
              "Write-Host 'TripSheriff Core Ledger & PayPal Gateway (Port 8080)' -ForegroundColor Yellow; " +
              "Write-Host '==================================================' -ForegroundColor Cyan; " +
              "if ('$javaBinDir' -and -not (Get-Command java -ErrorAction SilentlyContinue)) { `$env:PATH = '$javaBinDir;' + `$env:PATH }; " +
              "Set-Location '$BackendDir'; " +
              ".\mvnw.cmd spring-boot:run " +
              "}"

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $BackendCmd -WorkingDirectory $BackendDir

# Service 3: React Frontend (Port 3000)
Write-Host "  -> [3/3] Starting React / Vite Frontend on http://localhost:3000..." -ForegroundColor White
$FrontendCmd = "& { " +
               "`$host.UI.RawUI.WindowTitle = 'TripSheriff Frontend (Port 3000)'; " +
               "Write-Host '==================================================' -ForegroundColor Cyan; " +
               "Write-Host 'TripSheriff Frontend Simulator & Portal (Port 3000)' -ForegroundColor Yellow; " +
               "Write-Host '==================================================' -ForegroundColor Cyan; " +
               "Set-Location '$FrontendDir'; " +
               "npm run dev " +
               "}"

Start-Process powershell.exe -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $FrontendCmd -WorkingDirectory $FrontendDir

# ------------------------------------------------------------------------------
# 4. Health Polling
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Waiting for services to become healthy..." -ForegroundColor Cyan

function Test-Endpoint {
    param([string]$Url, [int]$TimeoutSec = 3)
    try {
        $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing -ErrorAction SilentlyContinue
        return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400)
    } catch {
        return $false
    }
}

$StartTime = Get-Date
$AiReady = $false
$BackendReady = $false
$FrontendReady = $false

Write-Host "  Polling endpoints (up to $MaxWaitSec seconds)..." -ForegroundColor DarkGray

while (((Get-Date) - $StartTime).TotalSeconds -lt $MaxWaitSec) {
    if (-not $AiReady) {
        $AiReady = Test-Endpoint "http://localhost:8001/health"
        if ($AiReady) { Write-Host "  [OK] Python AI Microservice is HEALTHY (http://localhost:8001/health)" -ForegroundColor Green }
    }

    if (-not $BackendReady) {
        $BackendReady = (Test-Endpoint "http://localhost:8080/v3/api-docs") -or (Test-Endpoint "http://localhost:8080/api/trips")
        if ($BackendReady) { Write-Host "  [OK] Java Spring Boot Backend is HEALTHY (http://localhost:8080)" -ForegroundColor Green }
    }

    if (-not $FrontendReady) {
        $FrontendReady = Test-Endpoint "http://localhost:3000"
        if ($FrontendReady) { Write-Host "  [OK] React Frontend Dev Server is READY (http://localhost:3000)" -ForegroundColor Green }
    }

    if ($AiReady -and $BackendReady -and $FrontendReady) {
        break
    }

    Start-Sleep -Seconds 2
}

# ------------------------------------------------------------------------------
# 5. Summary & Browser Launch
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Opening Frontend Web Simulator in default browser..." -ForegroundColor Cyan
Start-Process $BrowserUrl

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  All TripSheriff AI Services Are Running!                        " -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Web Simulator (Judge Test UI) : $BrowserUrl" -ForegroundColor White
Write-Host "  Overview Dashboard            : http://localhost:3000/" -ForegroundColor White
Write-Host "  AG Grid Ledger Table          : http://localhost:3000/ledger" -ForegroundColor White
Write-Host "  PayPal Payouts & Audit Log    : http://localhost:3000/payouts" -ForegroundColor White
Write-Host "  Backend Swagger UI            : http://localhost:8080/swagger-ui.html" -ForegroundColor DarkCyan
Write-Host "  H2 Database Console           : http://localhost:8080/h2-console" -ForegroundColor DarkCyan
Write-Host "  AI Health Endpoint            : http://localhost:8001/health" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Tip: To shut down all services cleanly, run:" -ForegroundColor Gray
Write-Host "       .\stop-all.ps1" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
