# Implementation Plan: Employee Workspace Portal

**Branch**: `005-employee-workspace` | **Date**: 2026-03-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-employee-workspace/spec.md`

---

## Summary

Employee workspace portal for kitchen staff at ILPI, enabling employees (Empleado role) to manage their personal schedules, request time off, and record work hours. Builds on existing ILPI MVP architecture (FastAPI backend, React frontend, PostgreSQL database). Feature provides restricted views (shifts, vacations, time tracking) with row-level security enforcing "self-only" data access. Password setup flow enables secure onboarding via email. All features integrate with existing modules (shift roster calendar from Feature 004, vacation system from Feature 001).

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Alembic (backend); React 19, Vite 6, react-big-calendar (frontend)
**Storage**: PostgreSQL 16 with SQLModel ORM, Alembic migrations
**Testing**: pytest + httpx (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Linux server (backend), modern browsers (frontend)
**Project Type**: Web application (REST API + SPA)
**Performance Goals**: <200ms API response p95, session load <3s, 50 concurrent employees
**Constraints**: Single-tenant MVP (ILPI), Spanish locale (es-ES), Europe/Madrid timezone, OWASP Top 10 compliance
**Scale/Scope**: ~50 employees, 3 views (shifts, vacations, time tracking), ~15 API endpoints, 5 new screens

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| **I. Clean Architecture** | ✅ PASS | Login flow isolated in auth service. Dashboard routers call shift/vacation/time-tracking services. Services own validation and business rules. Models remain domain-only. No DB queries in routers. |
| **II. Strict Modularity** | ✅ PASS | Feature adds: auth service (password setup), new routers for employee dashboard + 3 views, new services for time-tracking. All single-responsibility. No circular deps. Shared code in common/. |
| **III. Strict Type Safety** | ✅ PASS | All new endpoints typed. Pydantic v2 DTOs for requests/responses. Role enum (Empleado). mypy --strict applies. Frontend: TypeScript strict mode. |
| **IV. Production-Ready** | ✅ PASS | Password reset flow uses .env configuration. No hardcoded secrets. Alembic migrations for new columns. Audit logging for login, time-tracking. Seed script updated if needed. |
| **V. Security-First** | ✅ PASS | Employee RBAC: self-only data access enforced at service layer. JWT auth required. Password hashed bcrypt. Rate limiting on login (/auth/login: 10 req/min). No CSRF deferral (employee -> browser only, same SPA). Tenant isolation via tenant_id filter. |
| **VI. Error Handling** | ✅ PASS | Consistent error hierarchy (NotFoundError, UnauthorizedError, ValidationError). API returns `{error: {code, message}}`. No stack traces in responses. |

**Gate Result**: ✅ ALL PASS — Proceed to Phase 0 research.

---

## Project Structure

### Documentation (this feature)

```text
specs/005-employee-workspace/
├── spec.md              # Feature specification
├── plan.md              # This file (planning output)
├── research.md          # Phase 0: Design decisions & rationale
├── data-model.md        # Phase 1: Entity relationships & constraints
├── quickstart.md        # Phase 1: Quick reference for developers
├── contracts/           # Phase 1: API contracts
│   ├── employee-auth.md
│   ├── employee-dashboard.md
│   └── employee-time-tracking.md
└── checklists/
    └── requirements.md  # Quality validation (PASS ✅)
```

### Source Code (existing repository structure - Feature 005 additions)

```text
backend/
├── app/
│   ├── models/
│   │   ├── time_record.py          # NEW: Time clock-in/out records
│   │   └── __init__.py             # UPDATE: Add TimeRecord export
│   ├── schemas/
│   │   ├── auth.py                 # UPDATE: Add password-setup schema
│   │   └── time_tracking.py        # NEW: Clock-in/out DTO
│   ├── services/
│   │   ├── auth_service.py         # UPDATE: Add password-setup flow
│   │   ├── time_tracking_service.py # NEW: Clock-in/out, time records
│   │   └── __init__.py
│   └── routers/
│       ├── auth.py                 # UPDATE: Add password-setup endpoints
│       └── time_tracking.py        # NEW: Employee time-tracking endpoints
├── alembic/
│   └── versions/
│       └── [timestamp]_add_time_records_table.py # NEW: Migration
└── tests/
    ├── unit/
    │   ├── test_auth_service.py    # UPDATE: Password setup tests
    │   └── test_time_tracking_service.py # NEW
    └── integration/
        ├── test_auth_endpoints.py  # UPDATE
        └── test_time_tracking_endpoints.py # NEW

frontend/
├── src/
│   ├── views/
│   │   ├── EmployeeDashboard.tsx   # NEW: Main employee portal
│   │   ├── PasswordSetup.tsx       # NEW: Initial password creation
│   │   ├── EmployeeShiftRoster.tsx # UPDATE: Scope to self-only
│   │   ├── EmployeeVacations.tsx   # UPDATE: Scope to self-only
│   │   └── TimeTracking.tsx        # NEW: Clock in/out interface
│   ├── components/
│   │   ├── EmployeeNav.tsx         # NEW: Limited sidebar for employees
│   │   └── TimeTrackingWidget.tsx  # NEW: Clock in/out button
│   ├── services/
│   │   ├── authService.ts          # UPDATE: Password setup methods
│   │   └── timeTrackingService.ts  # NEW: Clock-in/out API calls
│   ├── types/
│   │   └── employee.ts             # NEW: Employee-specific types
│   └── hooks/
│       └── useTimeTracking.ts      # NEW: Clock-in/out state management
└── tests/
    ├── unit/
    │   └── timeTracking.test.tsx   # NEW
    └── integration/
        └── employeeWorkflow.test.tsx # NEW: End-to-end employee flow
```

---

## Design Decisions

### 1. Password Setup Flow

**Decision**: Email-based password reset on first login
**Rationale**:
- Aligns with existing auth system (users created by admin)
- No separate "registration" flow needed
- Familiar UX pattern (forgot password)
- Secure: token-based, time-limited

**Alternatives considered**:
- Admin manually assigns password (bad UX, insecure)
- SMS verification (not in scope, adds complexity)

---

### 2. Employee Dashboard Router Protection

**Decision**: RoleGuard at route level restricts Empleado role, shows 3-module sidebar
**Rationale**:
- Consistent with existing pattern (ProtectedRoute component)
- Prevents accidental navigation to admin features
- Clear visual distinction for employee experience

---

### 3. Time Records Storage

**Decision**: Immutable timestamp-based records (clock-in/out create new records)
**Rationale**:
- Audit-friendly (cannot edit past time entries)
- Prevents fraud (no retroactive hour modifications)
- Supports both "active clock" (in progress) and "completed clock" states
- Aligns with payroll security requirements

---

### 4. Row-Level Security (RLS)

**Decision**: Enforce `tenant_id` + `employee_id` filters at service layer
**Rationale**:
- No employee can query another employee's data
- Service validates current_user.employee_id matches requested data
- Defense-in-depth: both frontend (UI) and backend (service) checks
- Prevents accidental data leaks from API misuse

---

## Key Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Employee forgets to clock out** | Incomplete time record | UI shows "Currently clocked in" with countdown timer. Reminder notification (post-MVP). |
| **Timezone issues for timestamps** | Wrong hours recorded | All timestamps use tenant.timezone (Europe/Madrid). No user timezone selection in v1. |
| **Employee password reset while logged in** | Session invalidation | JWT refresh token lifecycle respected. Auto-logout on password change. |
| **Concurrent clock-in requests** | Duplicate time entries | Database unique constraint on (employee_id, date) for single clock-in per day. Idempotent API. |
| **Data sync issues offline** | Lost clock attempts | No offline mode in v1 (requires internet). Loading state prevents double-submission. |

---

## Dependencies & Integration Points

### Internal Dependencies
- **Feature 001 (Kitchen Staff CRUD)**: Employee model, role-based access control
- **Feature 004 (Shift Roster Calendar)**: Existing shift data, shift type definitions
- **Feature 001 (Vacation System)**: Existing vacation request/balance data
- **Existing Auth System**: JWT tokens, password hashing, session management

### External Dependencies
- **PostgreSQL 16**: JSONB logging, time functions
- **React 19**: Server components (if used), Suspense boundaries
- **FastAPI middleware**: Rate limiting, security headers already in place

---

## Testing Strategy

### Backend Testing
- **Unit Tests**: Password setup validation, time-tracking business logic, RLS filters
- **Integration Tests**: Full employee login flow, clock-in/out API, data isolation verification
- **Security Tests**: Attempt to access other employees' data, test role boundaries

### Frontend Testing
- **Component Tests**: Password setup form, clock button state transitions
- **Integration Tests**: Employee dashboard navigation, modal flows
- **E2E Tests**: Full employee workflow (login → clock in → view shifts → request vacation → clock out)

### Load Testing
- 50 concurrent employees clocking in simultaneously
- Calendar rendering with 1000+ shifts
- API response times <200ms p95

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 0 (Research) | 1-2 hours | research.md with design decisions |
| Phase 1 (Design) | 4-6 hours | data-model.md, contracts/, quickstart.md |
| Phase 2 (Tasks) | 30 min | tasks.md with dependency-ordered work items |
| Implementation | TBD (via tasks) | Code + tests |
| Code Review | TBD | Address feedback |
| Integration Testing | TBD | Full system validation |

---

## Next Steps

1. **Phase 0**: Generate `research.md` documenting all design decision rationales
2. **Phase 1**: Generate `data-model.md`, `/contracts/`, and `quickstart.md`
3. **Phase 2**: Run `/speckit.tasks` to create dependency-ordered implementation tasks
4. **Implementation**: Run `/speckit.implement` to execute tasks in order

**Ready to proceed to Phase 0 research**: ✅ YES
