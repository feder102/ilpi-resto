# Implementation Plan: Kitchen Staff Management MVP

**Branch**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-kitchen-staff-mgmt/spec.md`

## Summary

SaaS MVP for kitchen staff management at ILPI (Villa Joyosa, Alicante). The system provides RBAC authentication (Admin/Moderador/Empleado), full employee CRUD with soft delete, vacation request management with calendar-day balance validation, and shift rostering with clock-in/clock-out. Architecture follows Clean Architecture with a Python/FastAPI backend, PostgreSQL with SQLModel ORM, Alembic migrations, JWT auth, and a React + TypeScript + Vite frontend. All entities are tenant-aware (`tenant_id`) for future multi-tenant expansion; MVP deploys a single tenant.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Alembic, python-jose[cryptography], passlib[bcrypt], Pydantic v2 (backend); React 19, Vite 6, Recharts, Lucide React, react-router-dom v7, html5-qrcode, react-big-calendar (frontend)
**Storage**: PostgreSQL 16 with SQLModel ORM, Alembic migrations
**Testing**: pytest + httpx (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Linux server (backend), modern browsers (frontend)
**Project Type**: Web application (REST API + SPA)
**Performance Goals**: <200ms API response p95, 50 concurrent users, <3s page load
**Constraints**: Spanish locale (es-ES), Europe/Madrid timezone, OWASP Top 10 compliance
**Scale/Scope**: Single restaurant (ILPI), ~50 employees, 7 views, ~20 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Clean Architecture | PASS | Backend: Routers → Services → Models layering. Frontend: Views → Services → API. Dependencies point inward. |
| II. Strict Modularity | PASS | Routers (HTTP only), Services (business logic), Models (domain). No circular deps. Shared code in `common/`. |
| III. Strict Type Safety | PASS | Backend: Pydantic v2 models + type hints everywhere, mypy strict. Frontend: TypeScript strict mode. |
| IV. Production-Ready | PASS | Structured JSON logging, env-based config, Alembic migrations, no hardcoded secrets. |
| V. Security-First | PASS | JWT with expiration/refresh, RBAC at service layer, parameterized queries via ORM, CORS explicit config, rate limiting, security headers. |
| VI. Structured Error Handling | PASS | Domain exception hierarchy, consistent API error schema `{code, message, details}`, global exception handler, no stack traces in responses. |
| Security Requirements | PASS | OWASP review, least privilege RBAC, audit logging, PII encryption in transit (TLS), security headers. |
| Quality Gates | PASS | Type check (mypy/tsc), lint (ruff/eslint), test (pytest/vitest), security scan (safety/npm audit). |

**Gate Result**: ALL PASS — proceed to Phase 0.

### Post-Design Re-Check (Phase 1)

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Clean Architecture | PASS | Data model has zero infrastructure coupling. Services own business rules. Routers only serialize/deserialize. |
| II. Strict Modularity | PASS | 7 model files, 7 service files, 6 router files — each single-responsibility. No circular deps in dependency graph. |
| III. Strict Type Safety | PASS | All entities fully typed (UUID, enums, date, datetime). DTOs separate from DB models. No `Any` types. |
| IV. Production-Ready | PASS | Migrations via Alembic, env-based config, structured JSON logging, seed script. |
| V. Security-First | PASS | JWT auth on all endpoints, RBAC at service layer, tenant isolation, parameterized ORM queries, rate limiting, security headers, CORS explicit. |
| VI. Structured Error Handling | PASS | Consistent error envelope in API contract. Optimistic concurrency on vacation approval. Domain-specific error codes. |

**Post-Design Gate Result**: ALL PASS.

## Project Structure

### Documentation (this feature)

```text
specs/001-kitchen-staff-mgmt/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── alembic/
│   ├── versions/               # Migration files
│   ├── env.py
│   └── alembic.ini
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app factory, middleware, CORS, exception handlers
│   ├── config.py               # Settings via pydantic-settings (env vars)
│   ├── database.py             # SQLModel engine + session factory
│   ├── dependencies.py         # FastAPI dependency injection (get_db, get_current_user)
│   │
│   ├── common/
│   │   ├── __init__.py
│   │   ├── exceptions.py       # Domain exception hierarchy
│   │   ├── schemas.py          # Shared response/error DTOs
│   │   └── security.py         # JWT creation/verification, password hashing
│   │
│   ├── models/                 # SQLModel domain entities (DB tables)
│   │   ├── __init__.py
│   │   ├── tenant.py
│   │   ├── user.py
│   │   ├── employee.py
│   │   ├── team.py
│   │   ├── shift_record.py
│   │   ├── vacation_request.py
│   │   └── vacation_balance.py
│   │
│   ├── schemas/                # Pydantic DTOs (request/response)
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── tenant.py
│   │   ├── employee.py
│   │   ├── team.py
│   │   ├── shift.py
│   │   └── vacation.py
│   │
│   ├── services/               # Business logic (use cases)
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── tenant_service.py
│   │   ├── employee_service.py
│   │   ├── team_service.py
│   │   ├── shift_service.py
│   │   ├── vacation_service.py
│   │   └── dashboard_service.py
│   │
│   └── routers/                # HTTP transport layer only
│       ├── __init__.py
│       ├── auth.py
│       ├── employees.py
│       ├── teams.py
│       ├── shifts.py
│       ├── vacations.py
│       └── dashboard.py
│
├── tests/
│   ├── conftest.py             # Fixtures (test DB, client, auth tokens)
│   ├── unit/
│   │   ├── test_auth_service.py
│   │   ├── test_employee_service.py
│   │   ├── test_vacation_service.py
│   │   └── test_shift_service.py
│   └── integration/
│       ├── test_auth_endpoints.py
│       ├── test_employee_endpoints.py
│       ├── test_vacation_endpoints.py
│       └── test_shift_endpoints.py
│
├── requirements.txt
├── pyproject.toml
└── Dockerfile

frontend/
├── public/
│   └── vite.svg
├── src/
│   ├── main.tsx                # Entry point, React Router setup
│   ├── App.tsx                 # Root component, route definitions
│   ├── vite-env.d.ts
│   │
│   ├── types/                  # TypeScript type definitions
│   │   ├── index.ts            # Re-exports
│   │   ├── models.ts           # Domain types (Employee, ShiftRecord, etc.)
│   │   └── api.ts              # API response/request types
│   │
│   ├── config/
│   │   └── constants.ts        # API base URL, role permissions, departments
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useAuth.ts          # Auth context consumer
│   │   └── useApi.ts           # API call wrapper with loading/error state
│   │
│   ├── context/
│   │   └── AuthContext.tsx      # JWT auth state, login/logout, role info
│   │
│   ├── services/               # API client layer
│   │   ├── apiClient.ts        # Axios/fetch wrapper with JWT interceptor
│   │   ├── authService.ts
│   │   ├── employeeService.ts
│   │   ├── teamService.ts
│   │   ├── shiftService.ts
│   │   ├── vacationService.ts
│   │   └── dashboardService.ts
│   │
│   ├── components/             # Reusable UI components
│   │   ├── Layout.tsx          # Sidebar + header shell (from design)
│   │   ├── ProtectedRoute.tsx  # Role-based route guard
│   │   ├── StatCard.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── SearchFilter.tsx
│   │   ├── ConfirmDialog.tsx
│   │   └── FormField.tsx
│   │
│   └── views/                  # Page-level components (from design)
│       ├── LoginView.tsx
│       ├── DashboardView.tsx
│       ├── EmployeeListView.tsx
│       ├── RotaryView.tsx
│       ├── AttendanceView.tsx
│       ├── VacationView.tsx
│       ├── ReportsView.tsx
│       └── SettingsView.tsx
│
├── tests/
│   ├── setup.ts
│   └── views/
│       └── *.test.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── eslint.config.js
```

**Structure Decision**: Web application with separate `backend/` and `frontend/` directories at repository root. Backend follows Clean Architecture with 4 layers: Routers (transport) → Services (business logic) → Models (domain) + Schemas (DTOs). Frontend mirrors the existing design prototype structure with added auth context, proper routing, typed API services, and reusable components.

## Complexity Tracking

> No constitution violations detected. All principles satisfied with standard patterns.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| *(none)* | — | — |
