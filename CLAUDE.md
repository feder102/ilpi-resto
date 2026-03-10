# ILPI Spec Development Guidelines

**Project**: Kitchen Staff Management MVP (Kitchen Staff, Vacations, Shift Rostering)
**Methodology**: Spec-Development-Driven using **spec-kit**
**Last Updated**: 2026-03-09

---

## 🏗️ Core Principles (From Constitution)

This project follows **5 non-negotiable architectural principles**:

### I. Clean Architecture
- Dependencies point **inward**: Routers → Services → Models
- **Routers**: HTTP-only (serialization, response formatting, role checks)
- **Services**: All business logic (validation, state mutations, domain rules)
- **Models**: Pure domain entities (zero infrastructure coupling)
- No database queries in routers or frontend components

### II. Strict Modularity
- **Single Responsibility**: One reason to change per file
- **No Circular Dependencies**: Dependency graph is a DAG
- **Shared Code**: `backend/app/common/` (exceptions, schemas, utilities)
- **Model Aggregation**: `backend/app/models/__init__.py` re-exports all models for Alembic

### III. Strict Type Safety
- **Backend**: Type hints on all function signatures, Pydantic v2 models, `mypy --strict` (zero errors)
- **Frontend**: TypeScript strict mode, no `any` types without documented justification
- **Enums**: Use enums for categorical fields (Role, Department, Status, Gender, MaritalStatus, VacationStatus)

### IV. Production-Ready Deployment
- **Configuration**: All env-specific values from `.env` files (pydantic-settings backend, vite import.meta.env frontend)
- **Zero Hardcoded Secrets**: No API keys, database URLs, or JWT secrets in source
- **Structured JSON Logging**: Timestamp, level, module, message, context (user_id, tenant_id, action)
- **Alembic Migrations**: All schema changes via migrations (version-controlled, reversible)
- **Seed Data**: `backend/app/seed.py` for initial tenant/admin user setup

### V. Security-First
- **Authentication**: JWT with 30-min access token, 7-day refresh token (HttpOnly secure cookie)
- **Password**: Bcrypt hash (cost ≥10), never plaintext
- **RBAC**: Admin (full), Moderador (all except config), Empleado (own data only) — enforced at **service layer**
- **Data Protection**: TLS/SSL encryption, explicit CORS whitelist, rate limiting (10 req/min auth, 100 req/min others)
- **Security Headers**: X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, HSTS
- **Audit Logging**: All security-relevant events (login, authorization, CRUD, approvals, config changes)

---

## 🔧 Active Technologies

### Backend
- **Python 3.12** + FastAPI, SQLModel (ORM), Alembic (migrations)
- **Authentication**: python-jose[cryptography], passlib[bcrypt]
- **Validation**: Pydantic v2
- **Database**: PostgreSQL 16
- **Testing**: pytest + httpx
- **Linting**: ruff (target-version=py312, line-length=100)
- **Type Checking**: mypy --strict

### Frontend
- **React 19** + TypeScript 5.8+ + Vite 6
- **Routing**: react-router-dom v7
- **State**: React Context + hooks
- **Charts**: Recharts (analytics/dashboards)
- **Calendar**: react-big-calendar (shift rostering)
- **QR Scanning**: html5-qrcode
- **Icons**: Lucide React
- **HTTP**: Axios
- **Drag & Drop**: @dnd-kit (if needed)
- **Testing**: Vitest + React Testing Library

---

## 📊 Data Model Highlights

**Multi-tenant Aware** (single tenant MVP):
- Every entity has `tenant_id` foreign key for future multi-tenant expansion
- Tenant model: name, slug, timezone (default "Europe/Madrid"), locale (default "es")

**Key Entities**:
- **Tenant**: Organization container
- **User**: Authentication (email, hashed_password, role, employee_id optional)
- **Employee**: Full personal/professional record (DNI, email, phone, address, gender, birth date, marital status, hire date, department, emergency contact)
- **Team**: Department-based grouping (not a separate table; Department is an enum)
- **VacationBalance**: One per employee per year (accrual tracking)
- **VacationRequest**: Request with status (Pendiente/Aprobado/Rechazado/Cancelado)
- **ShiftRecord**: Clock-in/clock-out records

**Important Constraints**:
- **Uniqueness**: DNI and email MUST be unique per tenant
- **Soft Delete**: Employee deletion sets status=Inactivo (preserves historical records)
- **Vacation Counting**: Calendar days (dias naturales), including weekends/holidays
- **Employee Cancellation**: Can cancel only Pendiente requests; Aprobado require admin/moderator rejection

---

## 📂 Project Structure

```
ilpi-spec/
├── backend/                      # FastAPI + SQLModel backend
│   ├── app/
│   │   ├── common/              # Shared: exceptions, schemas, security, utilities
│   │   ├── models/              # SQLModel entities (re-exported in __init__.py for Alembic)
│   │   ├── schemas/             # Pydantic DTOs (request/response)
│   │   ├── services/            # Business logic (validation, mutations, queries)
│   │   ├── routers/             # FastAPI endpoints (HTTP only)
│   │   ├── dependencies.py      # FastAPI dependency injection
│   │   ├── database.py          # Connection & session setup
│   │   ├── config.py            # Environment & settings
│   │   ├── main.py              # FastAPI app initialization
│   │   └── seed.py              # Initial data (tenant "ILPI", admin user)
│   ├── alembic/                 # Database migrations
│   ├── tests/                   # Unit & integration tests
│   ├── Dockerfile               # Backend image
│   ├── pyproject.toml           # Dependencies, mypy, ruff, pytest config
│   ├── requirements.txt         # Pinned dependencies
│   ├── alembic.ini              # Alembic config
│   └── .env.example             # Environment template
│
├── frontend/                     # React 19 + TypeScript + Vite SPA
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── views/               # Page-level components (views)
│   │   ├── context/             # React Context (AuthContext, etc)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API client & utility services
│   │   ├── types/               # TypeScript interfaces/types
│   │   ├── App.tsx              # Root component
│   │   └── main.tsx             # Entry point
│   ├── public/                  # Static assets
│   ├── Dockerfile               # Frontend image
│   ├── package.json             # Dependencies
│   ├── tsconfig.json            # TypeScript config (strict: true)
│   ├── vite.config.ts           # Build config
│   └── .env.example             # Environment template
│
├── specs/                        # Spec-kit generated artifacts
│   └── 001-kitchen-staff-mgmt/
│       ├── spec.md              # Feature specification (user stories, acceptance criteria)
│       ├── plan.md              # Implementation plan & technical context
│       ├── constitution.md      # Project principles (5 non-negotiable pillars)
│       ├── data-model.md        # Entity relationships & constraints
│       ├── tasks.md             # Dependency-ordered implementation tasks
│       ├── research.md          # Design decisions & rationale
│       ├── quickstart.md        # Quick reference for developers
│       ├── contracts/           # API contract specifications
│       └── checklists/          # Feature checklists
│
├── .specify/                     # Spec-kit configuration
│   ├── memory/                  # Persistent memory across sessions
│   ├── scripts/                 # Spec-kit helper scripts
│   └── templates/               # Spec-kit templates
│
├── docker-compose.yml           # Local dev stack (backend, frontend, PostgreSQL)
├── .env.example                 # Root environment template
├── CLAUDE.md                     # This file (Claude Code guidelines)
└── README.md                     # Project setup & deployment documentation
```

---

## 🚀 Common Commands

### Backend
```bash
cd backend

# Setup
python -m venv venv
source venv/bin/activate  # Linux/Mac: source venv/bin/activate
pip install -r requirements.txt

# Type check
mypy app --strict

# Lint
ruff check . --fix

# Test
pytest
pytest --cov=app --cov-report=html

# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Run
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend

# Setup
npm install

# Lint
npm run lint

# Build
npm run build

# Dev
npm run dev
```

### Docker (Full Stack)
```bash
# From root
docker-compose up -d              # Start all services
docker-compose logs -f            # Stream all logs
docker-compose down               # Stop all services

# Database access
docker exec -it ilpi-spec-db-1 psql -U ilpi -d ilpi
```

---

## 🧠 Spec-Development-Driven Workflow

This project uses **spec-kit** for **specification-driven development**:

1. **Feature Planning**: New features start with a feature spec (user stories, clarifications, acceptance scenarios)
2. **Design Phase**: Architects design the system (data model, API contracts, implementation plan)
3. **Task Generation**: Spec-kit generates dependency-ordered tasks with acceptance criteria
4. **Implementation**: Developers implement tasks in dependency order
5. **Artifact Consistency**: `speckit.analyze` verifies spec/plan/tasks consistency

**Key Spec Artifacts**:
- **spec.md**: User stories, acceptance scenarios, clarifications
- **plan.md**: Technical design, architecture, tech stack, constitution gate checks
- **data-model.md**: Entity relationships, constraints, field definitions
- **tasks.md**: Dependency-ordered implementation tasks with acceptance criteria
- **constitution.md**: Non-negotiable principles (5 pillars above)

**When Adding Features**:
1. Run `speckit.specify` to create/update feature specification
2. Run `speckit.plan` to design the implementation
3. Run `speckit.tasks` to generate dependency-ordered tasks
4. Run `speckit.analyze` to verify consistency across artifacts
5. Use `speckit.implement` to execute tasks in order

---

## ✅ Quality Gates

Before committing code:

```bash
# Backend
cd backend
mypy app --strict      # Type safety
ruff check .           # Linting
pytest                 # Unit tests

# Frontend
cd frontend
npm run lint           # Linting
npm run build          # Build check
```

---

## 🔐 Security Checklist

- [ ] All sensitive config in `.env` (never hardcoded)
- [ ] All queries use ORM (never raw SQL in routers)
- [ ] All endpoints check role at **service layer** (not just frontend)
- [ ] No plaintext passwords (bcrypt with cost ≥10)
- [ ] JWT tokens have expiration (access: 30min, refresh: 7 days)
- [ ] CORS configured explicitly (no wildcard `*`)
- [ ] Security headers present (CSP, X-Frame-Options, HSTS, etc)
- [ ] Audit logging for security events (login, auth failures, CRUD, approvals)
- [ ] Rate limiting on auth endpoints (10 req/min login, 100 req/min others)

---

## 📝 Conventional Commits

```
feat:     New feature (spec-driven)
fix:      Bug fix
docs:     Documentation only
refactor: Code restructuring (no behavior change)
test:     Test additions/changes
chore:    Dependencies, tooling, build
```

Example: `feat: add vacation request CRUD endpoint with RBAC`

---

## 🔗 Key References

- **API Docs**: http://localhost:8000/docs (when running)
- **Spec Folder**: `specs/001-kitchen-staff-mgmt/` (all design decisions)
- **Constitution**: `specs/001-kitchen-staff-mgmt/constitution.md` (5 principles)
- **GitHub**: https://github.com/feder102/ilpi-resto

---

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
