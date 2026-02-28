# Project Manager Scripts - init-project

Quick scripts to start/stop the entire ILPI project (backend, frontend, and PostgreSQL).

---

## 📁 Folder Structure

```
ilpi-spec/
├── init                          ← Linux/macOS main entry point
├── init-project.sh              ← Linux/macOS wrapper
├── init-project.ps1             ← Windows PowerShell wrapper
├── init-project.bat             ← Windows CMD wrapper
├── init-project/                ← All scripts are here
│   ├── init-project.sh          ← Main bash script
│   ├── init-project.ps1         ← Main PowerShell script
│   ├── init-project.bat         ← Original batch
│   └── init-project-wrapper     ← Backup wrapper
└── INIT-PROJECT.md              ← This documentation
```

---

## 🚀 Quick Start

### Windows (PowerShell) - Recommended

**Option 1: PowerShell (Best)**
```powershell
# Start the project
.\init-project.ps1 start

# Stop the project
.\init-project.ps1 stop

# Restart
.\init-project.ps1 restart

# Check status
.\init-project.ps1 status
```

**Option 2: CMD/Batch**
```cmd
init-project.bat start
init-project.bat stop
init-project.bat restart
init-project.bat status
```

### Linux / macOS

**Option 1: Short command (easiest)**
```bash
./init --start
./init --stop
./init --restart
./init --status
./init --help
```

**Option 2: Full script**
```bash
./init-project.sh --start      # or -s
./init-project.sh --stop       # or -x
./init-project.sh --restart    # or -r
./init-project.sh --status     # or -st
./init-project.sh --help
```

---

## 📋 What the Script Does

### On Start (`--start`)
1. ✅ Verifies Docker is running
2. ✅ Starts PostgreSQL container (if not already running)
3. ✅ Creates Python venv (if needed)
4. ✅ Starts FastAPI backend on **port 8000**
5. ✅ Installs npm dependencies (if needed)
6. ✅ Starts Vite frontend dev server on **port 5173**

### On Stop (`--stop`)
1. 🛑 Kills all running backend/frontend processes
2. 🛑 Stops Docker containers gracefully
3. 🛑 Cleans up process tracking files

### On Restart (`--restart`)
1. Stops the project
2. Waits 2 seconds
3. Starts the project

### On Status (`--status`)
1. Shows which services are running
2. Displays process IDs
3. Lists Docker services status

---

## 🌐 Access URLs (When Running)

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React application |
| Backend API | http://localhost:8000 | REST API server |
| API Docs (Swagger) | http://localhost:8000/docs | Interactive API docs |
| API Docs (ReDoc) | http://localhost:8000/redoc | Alternative API docs |
| Database | localhost:5432 | PostgreSQL (ilpi/ilpi_dev_password) |

---

## 🔑 Default Credentials

After seeding data:
- **Email**: admin@ilpi.es
- **Password**: Admin123!
- **Role**: Admin

---

## 🐛 Troubleshooting

### "Docker is not running" Error
- **Windows**: Open Docker Desktop application
- **Linux**: Run `sudo systemctl start docker`
- **macOS**: Open Docker from Applications

### "Virtual environment not found" Warning
- The script automatically creates it — just wait
- If it fails, manually create it:
  ```bash
  cd backend
  python3 -m venv venv
  ```

### "Dependencies not found" Warning
- The script automatically runs `npm install` — just wait
- If it fails, manually install:
  ```bash
  cd frontend
  npm install
  ```

### Ports Already in Use
- Another process is using port 8000 or 5173
- **Windows**:
  ```powershell
  netstat -ano | findstr :8000
  taskkill /PID <PID> /F
  ```
- **Linux/Mac**:
  ```bash
  lsof -ti:8000 | xargs kill -9
  lsof -ti:5173 | xargs kill -9
  ```

### View Logs

**Windows (PowerShell)**:
```powershell
# Check if services are still running
Get-Process | grep python
Get-Process | grep node

# Kill specific process if needed
Stop-Process -Id <PID> -Force
```

**Linux/Mac**:
```bash
# Backend logs (if running in background)
tail -f /tmp/backend.log

# Frontend logs (if running in background)
tail -f /tmp/frontend.log

# View running processes
ps aux | grep "uvicorn\|npm"

# Kill process
kill -9 <PID>
```

---

## 📊 Project Structure Overview

```
ilpi-spec/
├── init                          ← Linux/macOS quick entry point
├── init-project.ps1             ← Windows PowerShell wrapper
├── init-project.sh              ← Linux/macOS wrapper
├── init-project.bat             ← Windows CMD wrapper
├── init-project/                ← Main scripts folder
│   ├── init-project.ps1         ← PowerShell implementation
│   ├── init-project.sh          ← Bash implementation
│   └── init-project.bat         ← Batch implementation
├── backend/                     ← FastAPI application (port 8000)
├── frontend/                    ← React Vite app (port 5173)
├── docker-compose.yml           ← PostgreSQL configuration
└── .pids                        ← Tracks running processes (auto-generated)
```

---

## ⚙️ Advanced Options

### Manual Execution (Without Script)

If you prefer to start services individually:

**Backend (Terminal 1)**:
```bash
cd backend
source venv/bin/activate    # or .\venv\Scripts\Activate.ps1 on Windows
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend (Terminal 2)**:
```bash
cd frontend
npm run dev
```

**Database (Automatic)**:
```bash
docker-compose up -d db
```

### Environment Variables

Check `backend/.env` and `frontend/.env.example` for configuration:

**Backend Environment** (`backend/.env`):
```env
DATABASE_URL=postgresql://ilpi:ilpi_dev_password@localhost:5432/ilpi
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=http://localhost:5173
LOG_LEVEL=INFO
```

---

## 🎯 Next Steps

1. **Start the project**: `init-project --start`
2. **Access frontend**: http://localhost:5173
3. **Login**: admin@ilpi.es / Admin123!
4. **View API docs**: http://localhost:8000/docs
5. **Stop when done**: `init-project --stop`

---

## 📝 Notes

- The script saves process IDs in `.pids` file for tracking
- On Windows, PowerShell execution policy might need adjustment:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```
- Services are started in parallel (concurrent) for faster startup
- Kill signals are graceful on first attempt, forced after 1 second
