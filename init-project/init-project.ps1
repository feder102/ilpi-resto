# ILPI Project Initialization Script (Windows PowerShell)
# Usage: .\init-project.ps1 -Action start
#        .\init-project.ps1 -Action stop
#        .\init-project.ps1 -Action status

param(
    [Parameter(Position = 0)]
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

    # Check if services are already running
    Write-Info "Checking if services are already running..."
    $running = docker-compose -f "$projectRoot/docker-compose.yml" ps --services --filter "status=running" 2>$null
    if ($running) {
        Write-Warning "Some services are already running:"
        Write-Host $running
        Write-Info "Use '.\init-project.ps1 stop' to stop them first, or '.\init-project.ps1 restart' to restart.`n"
        return
    }

    # ========== Start all services with docker-compose ==========
    Write-Info "Starting all services (PostgreSQL, Backend, Frontend)...`n"

    Push-Location $projectRoot
    docker-compose up -d

    if ($?) {
        Write-Success "All services started successfully`n"
        Start-Sleep -Seconds 5  # Give services time to start

        Write-Host "`n╔════════════════════════════════════════════════════════╗"
        Write-Host "║                ✓ Project Started                        ║"
        Write-Host "╚════════════════════════════════════════════════════════╝`n"

        Write-Success "Frontend: http://localhost:5173"
        Write-Success "Backend API: http://localhost:8000"
        Write-Success "API Docs: http://localhost:8000/docs"
        Write-Info "Database: localhost:5432 (ilpi / ilpi_dev_password)"
        Write-Info "Admin Login: admin@ilpi.es / Admin123!`n"

        Write-Info "View logs with: docker-compose logs -f"
        Write-Info "Or run: .\init-project.ps1 stop`n"
    }
    else {
        Write-Error "Failed to start services"
        Pop-Location
        exit 1
    }

    Pop-Location
}

# ============================================================================
# STOP FUNCTION
# ============================================================================
function Stop-Project {
    Write-Info "Stopping ILPI Project...`n"

    Push-Location $projectRoot

    # Stop all Docker services
    Write-Info "Stopping Docker services..."
    docker-compose down

    if ($?) {
        Write-Success "All services stopped"
    }
    else {
        Write-Warning "Some services may not have stopped cleanly"
    }

    # Clean up old PID file if exists
    if (Test-Path $pidFile) {
        Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue
    }

    Pop-Location

    Write-Host "`n╔════════════════════════════════════════════════════════╗"
    Write-Host "║              ✓ Project Stopped                         ║"
    Write-Host "╚════════════════════════════════════════════════════════╝`n"
}

# ============================================================================
# STATUS FUNCTION
# ============================================================================
function Show-Status {
    Write-Host "`n📊 Project Status:`n"

    Push-Location $projectRoot

    # Check Docker services
    Write-Info "Checking Docker services..."
    $status = docker-compose ps

    if ($status) {
        Write-Host $status
        Write-Host ""
    }
    else {
        Write-Warning "No services running"
    }

    Pop-Location
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
