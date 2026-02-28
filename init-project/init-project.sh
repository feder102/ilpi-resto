#!/bin/bash

# ILPI Project Initialization Script (Linux/Mac)
# Usage: ./init-project.sh --start
#        ./init-project.sh --stop
#        ./init-project.sh --restart
#        ./init-project.sh --status

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get project root - handle both direct and wrapper execution
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# If script is in init-project folder, go up one level to project root
if [ "$(basename "$SCRIPT_DIR")" = "init-project" ]; then
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi

PID_FILE="$PROJECT_ROOT/.pids"

# Helper functions
info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
}

header() {
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║    ILPI Kitchen Staff Management - Project Manager     ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
}

# ============================================================================
# START FUNCTION
# ============================================================================
start_project() {
    header
    info "Starting ILPI Project..."
    info "Project root: $PROJECT_ROOT"
    echo ""

    # Check if already running
    if [ -f "$PID_FILE" ]; then
        warning "Project may already be running. Checking..."
        show_status
        return 1
    fi

    # Verify Docker is running
    info "Checking Docker..."
    if docker info > /dev/null 2>&1; then
        success "Docker is running"
    else
        error "Docker is not running. Please start Docker."
        exit 1
    fi

    # Create .pids file
    > "$PID_FILE"

    # ========== Start PostgreSQL ==========
    info "Starting PostgreSQL..."
    if docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps db 2>/dev/null | grep -q "running"; then
        success "PostgreSQL already running"
    else
        docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d db
        if [ $? -eq 0 ]; then
            success "PostgreSQL started"
            sleep 3
        else
            error "Failed to start PostgreSQL"
            exit 1
        fi
    fi

    # ========== Start Backend ==========
    info "Starting Backend (FastAPI on port 8000)..."
    cd "$PROJECT_ROOT/backend"

    # Check if venv exists
    if [ ! -d "venv" ]; then
        warning "Virtual environment not found. Creating..."
        python3 -m venv venv
        if [ $? -eq 0 ]; then
            success "Virtual environment created"
        else
            error "Failed to create virtual environment"
            cd "$PROJECT_ROOT"
            exit 1
        fi
    fi

    # Activate venv and start backend in background
    source venv/bin/activate
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID >> "$PID_FILE"
    success "Backend started (PID: $BACKEND_PID)"

    cd "$PROJECT_ROOT"
    sleep 2

    # ========== Start Frontend ==========
    info "Starting Frontend (Vite on port 5173)..."
    cd "$PROJECT_ROOT/frontend"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        warning "Dependencies not found. Running 'npm install'..."
        npm install
        if [ $? -ne 0 ]; then
            error "Failed to install frontend dependencies"
            cd "$PROJECT_ROOT"
            exit 1
        fi
    fi

    # Start frontend dev server in background
    npm run dev > /tmp/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID >> "$PID_FILE"
    success "Frontend started (PID: $FRONTEND_PID)"

    cd "$PROJECT_ROOT"

    # ========== Success Message ==========
    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║                ✓ Project Started                        ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    success "Frontend: http://localhost:5173"
    success "Backend API: http://localhost:8000"
    success "API Docs: http://localhost:8000/docs"
    info "Database: localhost:5432 (ilpi / ilpi_dev_password)"
    info "Admin Login: admin@ilpi.es / Admin123!"
    echo ""
    info "View logs:"
    info "  Backend:  tail -f /tmp/backend.log"
    info "  Frontend: tail -f /tmp/frontend.log"
    echo ""
    info "To stop: $0 --stop"
    echo ""
}

# ============================================================================
# STOP FUNCTION
# ============================================================================
stop_project() {
    header
    info "Stopping ILPI Project..."
    echo ""

    # Kill saved processes
    if [ -f "$PID_FILE" ]; then
        while IFS= read -r pid; do
            if [ ! -z "$pid" ] && [ "$pid" -gt 0 ] 2>/dev/null; then
                if kill -0 "$pid" 2>/dev/null; then
                    info "Stopping process (PID: $pid)..."
                    kill "$pid" 2>/dev/null
                    # Wait a bit then force kill if still running
                    sleep 1
                    kill -9 "$pid" 2>/dev/null
                    success "Process stopped"
                fi
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi

    # Stop Docker services
    info "Stopping Docker services..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" stop > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        success "Docker services stopped"
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║              ✓ Project Stopped                         ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
}

# ============================================================================
# STATUS FUNCTION
# ============================================================================
show_status() {
    echo ""
    echo "📊 Project Status:"
    echo ""

    # Check frontend
    if pgrep -f "vite" > /dev/null; then
        FRONTEND_PID=$(pgrep -f "vite" | head -1)
        success "Frontend running (PID: $FRONTEND_PID)"
    else
        warning "Frontend not running"
    fi

    # Check backend
    if pgrep -f "uvicorn" > /dev/null; then
        BACKEND_PID=$(pgrep -f "uvicorn" | head -1)
        success "Backend running (PID: $BACKEND_PID)"
    else
        warning "Backend not running"
    fi

    # Check Docker services
    DOCKER_STATUS=$(docker-compose -f "$PROJECT_ROOT/docker-compose.yml" ps --services --filter "status=running" 2>/dev/null)
    if [ ! -z "$DOCKER_STATUS" ]; then
        success "Docker services running"
    else
        warning "Docker services not running"
    fi

    echo ""
}

# ============================================================================
# RESTART FUNCTION
# ============================================================================
restart_project() {
    stop_project
    sleep 2
    start_project
}

# ============================================================================
# MAIN LOGIC
# ============================================================================
case "${1:---start}" in
    --start|-s|start)
        start_project
        ;;
    --stop|-x|stop)
        stop_project
        ;;
    --restart|-r|restart)
        restart_project
        ;;
    --status|-st|status)
        show_status
        ;;
    --help|-h|help)
        echo "ILPI Project Manager"
        echo ""
        echo "Usage: $0 [COMMAND]"
        echo ""
        echo "Commands:"
        echo "  --start, -s, start          Start the project"
        echo "  --stop, -x, stop            Stop the project"
        echo "  --restart, -r, restart      Restart the project"
        echo "  --status, -st, status       Show project status"
        echo "  --help, -h, help            Show this help message"
        echo ""
        ;;
    *)
        error "Unknown command: $1"
        echo "Use '$0 --help' for usage information."
        exit 1
        ;;
esac
