# ILPI Spec Project Memory

**Project**: ILPI Kitchen Staff Management MVP (Gestión de Personal de Cocina)
**Methodology**: Spec-Development-Driven using **spec-kit** (NOT traditional Agile)
**Stack**: Python 3.12 + FastAPI + SQLModel + PostgreSQL (Backend) | React 19 + TypeScript + Vite (Frontend)

## 🏗️ Architecture Fundamentals

**5 Non-Negotiable Principles** (from constitution.md):

1. **Clean Architecture**: Routers (HTTP only) → Services (business logic) → Models (domain). No DB queries in routers.
2. **Strict Modularity**: Single responsibility per file, no circular deps, shared code in `backend/app/common/`
3. **Type Safety**: `mypy --strict` backend, TypeScript strict mode frontend, Pydantic v2 DTOs
4. **Production-Ready**: All config from `.env`, Alembic migrations, structured JSON logging, seed.py for initial data
5. **Security-First**: JWT (30min access, 7d refresh), bcrypt, RBAC at service layer, tenant-aware queries, rate limiting, audit logging

## 📊 Data Model Key Points

- **Multi-tenant aware** (single tenant MVP): Every entity has `tenant_id` FK
- **Unique per tenant**: DNI and email must be unique per tenant
- **Soft delete**: Employee deletion sets status=Inactivo (preserves history)
- **Vacation**: Calendar days counting (dias naturales), includes weekends/holidays
- **Enums**: Use enums for Role, Department, Status, Gender, MaritalStatus, VacationStatus

## 📂 Critical File Locations

- `specs/001-kitchen-staff-mgmt/` — ALL design decisions (spec.md, plan.md, constitution.md, data-model.md, tasks.md)
- `backend/app/common/` — Shared exceptions, schemas, utilities
- `backend/app/models/__init__.py` — Model re-exports (critical for Alembic)
- `backend/app/seed.py` — Initial data setup (tenant "ILPI", admin user)
- `backend/app/services/` — All business logic (validation, mutations, queries)
- `frontend/src/context/` — React Context for auth/state

## ⚡ Spec-Kit Workflow (Important!)

When adding features:
1. `speckit.specify` — Create/update feature spec (user stories, acceptance criteria)
2. `speckit.plan` — Design system (architecture, data model, tech decisions)
3. `speckit.tasks` — Generate dependency-ordered tasks
4. `speckit.analyze` — Verify spec/plan/tasks consistency
5. `speckit.implement` — Execute tasks in order

This is NOT traditional Agile — every feature must have a spec.md with acceptance scenarios first.

## 🔐 Security Essentials

- All sensitive config → `.env` (never hardcoded)
- All DB queries → ORM (never raw SQL)
- Role checks → **service layer** (not frontend)
- Passwords → bcrypt (cost ≥10)
- Audit logging for: login, auth failures, CRUD, vacations, config changes
- Rate limit: 10 req/min on `/auth/login`, 100 req/min elsewhere

## 🧪 Quality Gates

Always run before commit:
```bash
cd backend && mypy app --strict && ruff check . && pytest
cd frontend && npm run lint && npm run build
```

## ⚡ Quick Start Scripts

Three ways to start the project:

**Windows (PowerShell)**: `.\init-project.ps1 start`
**Windows (CMD)**: `init-project.bat start`
**Linux/macOS**: `./init --start`

Scripts handle: Docker + PostgreSQL setup, Python venv, npm dependencies, backend (FastAPI port 8000), frontend (Vite port 5173)

## 🔗 Key References

- **QUICKSTART.md** - Fastest way to start (2 commands!)
- **INIT-PROJECT.md** - Full initialization guide
- **COMMANDS.md** - All command reference
- Constitution: `specs/001-kitchen-staff-mgmt/constitution.md` (read first!)
- Spec-Kit skills: `speckit.specify`, `speckit.plan`, `speckit.tasks`, `speckit.analyze`, `speckit.implement`
- API Docs: http://localhost:8000/docs (when running)
