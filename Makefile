.PHONY: dev build down logs shell-backend shell-frontend db-shell help

help:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  🚀 ILPI Dev Environment - Makefile Commands"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "  make dev                 - Start entire dev stack (DB, Backend, Frontend, Nginx)"
	@echo "  make build               - Rebuild all containers (use when deps change)"
	@echo "  make down                - Stop all containers"
	@echo "  make logs                - Stream logs from all services"
	@echo "  make shell-backend       - Open bash in backend container"
	@echo "  make shell-frontend      - Open bash in frontend container"
	@echo "  make db-shell            - Open psql in database"
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  📍 Quick Access"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  Frontend:  http://localhost"
	@echo "  API Docs:  http://localhost/api/v1/docs"
	@echo "  Backend:   http://localhost:8010 (direct)"
	@echo ""

dev:
	@echo "🚀 Starting ILPI dev stack..."
	docker compose -f docker-compose.dev.yml up

build:
	@echo "🔨 Building containers..."
	docker compose -f docker-compose.dev.yml build

down:
	@echo "⬇️  Stopping containers..."
	docker compose -f docker-compose.dev.yml down

logs:
	@echo "📊 Streaming logs from all services..."
	docker compose -f docker-compose.dev.yml logs -f

shell-backend:
	docker exec -it ilpi-backend-dev /bin/bash

shell-frontend:
	docker exec -it ilpi-frontend-dev /bin/sh

db-shell:
	docker exec -it ilpi-db-dev psql -U ilpi -d ilpi

# Clean database (CAUTION: deletes all data)
db-clean:
	@echo "⚠️  WARNING: This will DELETE all database data!"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f docker-compose.dev.yml down -v; \
		docker compose -f docker-compose.dev.yml up db; \
	fi

# Run backend tests
test-backend:
	docker exec ilpi-backend-dev pytest

# Run backend type check
typecheck-backend:
	docker exec ilpi-backend-dev mypy app --strict

# Run backend linting
lint-backend:
	docker exec ilpi-backend-dev ruff check .

# Run frontend tests
test-frontend:
	docker exec ilpi-frontend-dev npm test

# Run frontend linting
lint-frontend:
	docker exec ilpi-frontend-dev npm run lint

# Full quality check
quality: typecheck-backend lint-backend lint-frontend
	@echo "✅ Quality checks passed!"
