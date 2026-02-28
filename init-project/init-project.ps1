# ILPI Project Initialization Script (Windows PowerShell)
# Usage: .\init-project.ps1 -Action start
#        .\init-project.ps1 -Action stop
#        .\init-project.ps1 -Action status

param(
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Action = "start"
)

# Colors for output
$colors = @{
    "info"    = "Cyan"
    "success" = "Green"
    "warning" = "Yellow"
    "error"   = "Red"
}

function Write-Info {
    Write-Host "[INFO]" -ForegroundColor $colors["info"] -NoNewline
    Write-Host " $args"
}

function Write-Success {
    Write-Host "[✓]" -ForegroundColor $colors["success"] -NoNewline
    Write-Host " $args"
}

function Write-Warning {
    Write-Host "[⚠]" -ForegroundColor $colors["warning"] -NoNewline
    Write-Host " $args"
}

function Write-Error {
    Write-Host "[✗]" -ForegroundColor $colors["error"] -NoNewline
    Write-Host " $args"
}

# Get project root - handle both direct and wrapper execution
if ($MyInvocation.MyCommandPath) {
    $scriptPath = $MyInvocation.MyCommandPath
} else {
    $scriptPath = $PSCommandPath
}

# If script is in init-project folder, go up one level to project root
$parentDir = Split-Path -Parent $scriptPath
if ((Split-Path -Leaf $parentDir) -eq "init-project") {
    $projectRoot = Split-Path -Parent $parentDir
} else {
    $projectRoot = $parentDir
}

$pidFile = Join-Path $projectRoot ".pids"

Write-Host "`n╔════════════════════════════════════════════════════════╗"
Write-Host "║    ILPI Kitchen Staff Management - Project Manager     ║"
Write-Host "╚════════════════════════════════════════════════════════╝`n"

# ============================================================================
# START FUNCTION
# ============================================================================
function Start-Project {
    Write-Info "Starting ILPI Project..."
    Write-Info "Project root: $projectRoot`n"

    # Check if already running
    if (Test-Path $pidFile) {
        $pids = Get-Content $pidFile -ErrorAction SilentlyContinue
        if ($pids) {
            Write-Warning "Project appears to be already running. Use '--stop' to stop it first."
            Show-Status
            return
        }
    }

    # Verify Docker is running
    Write-Info "Checking Docker..."
    try {
        $docker = docker ps -q 2>$null
        Write-Success "Docker is running"
    }
    catch {
        Write-Error "Docker is not running. Please start Docker Desktop."
        exit 1
    }

    # Create .pids file to track processes
    New-Item -Path $pidFile -Force | Out-Null
    $pids = @()

    # ========== Start PostgreSQL ==========
    Write-Info "Starting PostgreSQL..."
    $dbCheck = docker-compose -f "$projectRoot/docker-compose.yml" ps db 2>$null | Select-String "running"
    if ($dbCheck) {
        Write-Success "PostgreSQL already running"
    }
    else {
        docker-compose -f "$projectRoot/docker-compose.yml" up -d db
        if ($?) {
            Write-Success "PostgreSQL started"
            Start-Sleep -Seconds 3
        }
        else {
            Write-Error "Failed to start PostgreSQL"
            exit 1
        }
    }

    # ========== Start Backend ==========
    Write-Info "Starting Backend (FastAPI on port 8000)..."
    Push-Location "$projectRoot/backend"

    # Check if venv exists
    if (-not (Test-Path "venv")) {
        Write-Warning "Virtual environment not found. Creating..."
        python -m venv venv
        if ($?) {
            Write-Success "Virtual environment created"
        }
        else {
            Write-Error "Failed to create virtual environment"
            Pop-Location
            exit 1
        }
    }

    # Activate venv and start backend
    $backendCmd = ".\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -PassThru
    $pids += $backendProcess.Id
    Write-Success "Backend started (PID: $($backendProcess.Id))"

    Pop-Location
    Start-Sleep -Seconds 2

    # ========== Start Frontend ==========
    Write-Info "Starting Frontend (Vite on port 5173)..."
    Push-Location "$projectRoot/frontend"

    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Warning "Dependencies not found. Running 'npm install'..."
        npm install
        if (-not $?) {
            Write-Error "Failed to install frontend dependencies"
            Pop-Location
            exit 1
        }
    }

    # Start frontend dev server
    $frontendCmd = "npm run dev"
    $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -PassThru
    $pids += $frontendProcess.Id
    Write-Success "Frontend started (PID: $($frontendProcess.Id))"

    Pop-Location

    # ========== Save PIDs ==========
    $pids | Out-File -FilePath $pidFile -Encoding UTF8

    Write-Host "`n╔════════════════════════════════════════════════════════╗"
    Write-Host "║                ✓ Project Started                        ║"
    Write-Host "╚════════════════════════════════════════════════════════╝`n"

    Write-Success "Frontend: http://localhost:5173"
    Write-Success "Backend API: http://localhost:8000"
    Write-Success "API Docs: http://localhost:8000/docs"
    Write-Info "Database: localhost:5432 (ilpi / ilpi_dev_password)"
    Write-Info "Admin Login: admin@ilpi.es / Admin123!"
    Write-Info "`nPress Ctrl+C in each window to stop services"
    Write-Info "Or run: .\init-project.ps1 -Action stop`n"
}

# ============================================================================
# STOP FUNCTION
# ============================================================================
function Stop-Project {
    Write-Info "Stopping ILPI Project...`n"

    # Kill saved processes
    if (Test-Path $pidFile) {
        $pids = @(Get-Content $pidFile)

        foreach ($pid in $pids) {
            if ($pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Info "Stopping process (PID: $pid)..."
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Success "Process stopped"
                    }
                }
                catch {
                    Write-Warning "Process $pid not found (already stopped)"
                }
            }
        }

        Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
    }

    # Stop Docker services (but keep DB for potential reuse)
    Write-Info "Stopping Docker services..."
    docker-compose -f "$projectRoot/docker-compose.yml" stop
    if ($?) {
        Write-Success "Docker services stopped"
    }

    Write-Host "`n╔════════════════════════════════════════════════════════╗"
    Write-Host "║              ✓ Project Stopped                         ║"
    Write-Host "╚════════════════════════════════════════════════════════╝`n"
}

# ============================================================================
# STATUS FUNCTION
# ============================================================================
function Show-Status {
    Write-Host "`n📊 Project Status:`n"

    # Check frontend
    $frontend = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" }
    if ($frontend) {
        Write-Success "Frontend running (PID: $($frontend.Id))"
    }
    else {
        Write-Warning "Frontend not running"
    }

    # Check backend
    $backend = Get-Process -Name python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" }
    if ($backend) {
        Write-Success "Backend running (PID: $($backend.Id))"
    }
    else {
        Write-Warning "Backend not running"
    }

    # Check Docker services
    $dockerStatus = docker-compose -f "$projectRoot/docker-compose.yml" ps --services --filter "status=running" 2>$null
    if ($dockerStatus) {
        Write-Success "Docker services running: $dockerStatus"
    }
    else {
        Write-Warning "Docker services not running"
    }

    Write-Host ""
}

# ============================================================================
# RESTART FUNCTION
# ============================================================================
function Restart-Project {
    Write-Info "Restarting project..."
    Stop-Project
    Start-Sleep -Seconds 2
    Start-Project
}

# ============================================================================
# MAIN LOGIC
# ============================================================================
try {
    switch ($Action) {
        "start" {
            Start-Project
        }
        "stop" {
            Stop-Project
        }
        "restart" {
            Restart-Project
        }
        "status" {
            Show-Status
        }
    }
}
catch {
    Write-Error "An error occurred: $_"
    exit 1
}
