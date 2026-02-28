# Script para matar todos los procesos de backend y frontend
# Uso: .\kill-processes.ps1

Write-Host "╔════════════════════════════════════════════════════════════════╗"
Write-Host "║  Matando procesos de Backend y Frontend                        ║"
Write-Host "╚════════════════════════════════════════════════════════════════╝"

$killed = @()

# Método 1: Matar por puertos específicos
Write-Host "`n📍 Buscando procesos en puertos..."

# Puerto 8000 (Backend)
try {
    $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  ⚡ Backend (Puerto 8000, PID: $pid, Proceso: $($proc.Name))"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                $killed += $pid
            }
        }
    }
} catch {}

# Puerto 5173 (Frontend)
try {
    $connections = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $pid = $conn.OwningProcess
            $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  ⚡ Frontend (Puerto 5173, PID: $pid, Proceso: $($proc.Name))"
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                $killed += $pid
            }
        }
    }
} catch {}

# Método 2: Matar procesos Node.js (Frontend)
Write-Host "`n📍 Buscando procesos Node.js..."
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    if ($nodeProcesses -is [System.Array]) {
        foreach ($proc in $nodeProcesses) {
            if ($killed -notcontains $proc.Id) {
                Write-Host "  ⚡ Node.js (PID: $($proc.Id))"
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $killed += $proc.Id
            }
        }
    } else {
        if ($killed -notcontains $nodeProcesses.Id) {
            Write-Host "  ⚡ Node.js (PID: $($nodeProcesses.Id))"
            Stop-Process -Id $nodeProcesses.Id -Force -ErrorAction SilentlyContinue
            $killed += $nodeProcesses.Id
        }
    }
}

# Método 3: Matar procesos Python (Backend con uvicorn)
Write-Host "`n📍 Buscando procesos Python..."
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    if ($pythonProcesses -is [System.Array]) {
        foreach ($proc in $pythonProcesses) {
            if ($killed -notcontains $proc.Id) {
                Write-Host "  ⚡ Python (PID: $($proc.Id))"
                Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                $killed += $proc.Id
            }
        }
    } else {
        if ($killed -notcontains $pythonProcesses.Id) {
            Write-Host "  ⚡ Python (PID: $($pythonProcesses.Id))"
            Stop-Process -Id $pythonProcesses.Id -Force -ErrorAction SilentlyContinue
            $killed += $pythonProcesses.Id
        }
    }
}

# Resumen
Write-Host "`n╔════════════════════════════════════════════════════════════════╗"
if ($killed.Count -gt 0) {
    Write-Host "✅ Se terminaron $($killed.Count) proceso(s): $(($killed -join ', '))"
} else {
    Write-Host "ℹ️  No se encontraron procesos activos"
}
Write-Host "╚════════════════════════════════════════════════════════════════╝`n"
