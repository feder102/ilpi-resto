# 🚀 ILPI Project - Quick Start Guide

Get the project running in 2 commands!

---

## ⚡ Windows (PowerShell)

```powershell
# 1. Start the project
.\init-project.ps1 start

# 2. Wait for all services to start...
# 3. Access at: http://localhost:5173
```

## ⚡ Windows (CMD)

```cmd
# 1. Start the project
init-project.bat start

# 2. Wait for all services to start...
# 3. Access at: http://localhost:5173
```

## ⚡ Linux / macOS

```bash
# 1. Start the project
./init --start

# 2. Wait for all services to start...
# 3. Access at: http://localhost:5173
```

---

## 📝 What Happens

The script automatically:

✅ Starts PostgreSQL (Docker)
✅ Creates Python venv (if needed)
✅ Starts FastAPI backend (port 8000)
✅ Installs npm dependencies (if needed)
✅ Starts Vite frontend (port 5173)

---

## 🌐 Access Your App

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:5173 |
| **Backend API** | http://localhost:8000 |
| **API Documentation** | http://localhost:8000/docs |

---

## 🔑 Login

```
Email:    admin@ilpi.es
Password: Admin123!
```

---

## 🛑 Stop the Project

```powershell
# Windows PowerShell
.\init-project.ps1 stop

# Windows CMD
init-project.bat stop

# Linux/macOS
./init --stop
```

---

## 📚 Documentation

- **Full Setup**: See `INIT-PROJECT.md`
- **Commands Reference**: See `COMMANDS.md`
- **Project Architecture**: See `CLAUDE.md`
- **Feature Specs**: See `specs/001-kitchen-staff-mgmt/spec.md`
- **Project Memory**: See `MEMORY.md`

---

## ⚠️ Prerequisites

Before starting, make sure you have:

- ✅ Docker Desktop running
- ✅ Python 3.12+ installed
- ✅ Node.js 18+ installed
- ✅ Git installed

Check them:
```bash
docker --version
python --version
node --version
npm --version
```

---

## 🆘 Troubleshooting

**"Docker is not running"**
→ Open Docker Desktop application

**"Port 8000/5173 already in use"**
→ Another process is using the port. Kill it or use different ports in `.env`

**"npm/venv not found"**
→ The script automatically creates them. Just wait!

For more help, see `INIT-PROJECT.md`

---

## 🎯 Next Steps

1. ✅ Run the start command above
2. ✅ Open http://localhost:5173 in your browser
3. ✅ Login with admin@ilpi.es / Admin123!
4. ✅ Explore the app and start developing!

**Happy coding!** 🎉
