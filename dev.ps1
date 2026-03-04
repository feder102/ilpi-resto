# PowerShell helper for ILPI dev environment (Windows-friendly alternative to Makefile)
# Usage: .\dev.ps1 <command>

param(
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  🚀 ILPI Dev Environment - PowerShell Commands" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  .\dev.ps1 dev                 - Start entire dev stack" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 build               - Rebuild all containers" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 down                - Stop all containers" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 logs                - Stream logs from all services" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 shell-backend       - Open bash in backend container" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 shell-frontend      - Open bash in frontend container" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 db-shell            - Open psql in database" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 test-backend        - Run backend tests" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 lint-backend        - Run backend linting" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  📍 Quick Access" -ForegroundColor Green
    Write-Host "════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Frontend:  http://localhost" -ForegroundColor Magenta
    Write-Host "  API Docs:  http://localhost/api/v1/docs" -ForegroundColor Magenta
    Write-Host "  Backend:   http://localhost:8010 (direct)" -ForegroundColor Magenta
    Write-Host ""
}

switch ($Command) {
    "dev" {
        Write-Host "🚀 Starting ILPI dev stack..." -ForegroundColor Green
        docker compose -f docker-compose.dev.yml up
    }
    "build" {
        Write-Host "🔨 Building containers..." -ForegroundColor Green
        docker compose -f docker-compose.dev.yml build
    }
    "down" {
        Write-Host "⬇️  Stopping containers..." -ForegroundColor Green
        docker compose -f docker-compose.dev.yml down
    }
    "logs" {
        Write-Host "📊 Streaming logs..." -ForegroundColor Green
        docker compose -f docker-compose.dev.yml logs -f
    }
    "shell-backend" {
        docker exec -it ilpi-backend-dev /bin/bash
    }
    "shell-frontend" {
        docker exec -it ilpi-frontend-dev /bin/sh
    }
    "db-shell" {
        docker exec -it ilpi-db-dev psql -U ilpi -d ilpi
    }
    "test-backend" {
        Write-Host "🧪 Running backend tests..." -ForegroundColor Green
        docker exec ilpi-backend-dev pytest
    }
    "lint-backend" {
        Write-Host "🔍 Running backend linter..." -ForegroundColor Green
        docker exec ilpi-backend-dev ruff check .
    }
    "typecheck-backend" {
        Write-Host "🔍 Running type checker..." -ForegroundColor Green
        docker exec ilpi-backend-dev mypy app --strict
    }
    "lint-frontend" {
        Write-Host "🔍 Running frontend linter..." -ForegroundColor Green
        docker exec ilpi-frontend-dev npm run lint
    }
    "quality" {
        Write-Host "✅ Running all quality checks..." -ForegroundColor Green
        docker exec ilpi-backend-dev mypy app --strict
        docker exec ilpi-backend-dev ruff check .
        docker exec ilpi-frontend-dev npm run lint
        Write-Host "✅ Quality checks passed!" -ForegroundColor Green
    }
    default {
        Show-Help
    }
}
