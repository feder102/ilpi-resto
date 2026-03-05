# Implementation Plan: Shift Roster Calendar View

**Branch**: `004-shift-roster-calendar` | **Date**: 2026-03-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-shift-roster-calendar/spec.md`

---

## Summary

Implement a full-stack shift rostering calendar view allowing Admin/Moderador roles to assign employees to specific days with shift types, and Empleado roles to view only their own assignments. The frontend uses `react-big-calendar` for month-view display with a custom assignment dialog, while the backend provides REST endpoints for ShiftRecord CRUD with conflict detection and vacation request integration.

**Key Technical Decisions**:
1. **ShiftType Enum**: Predefined shift types (morning/afternoon/night) in Employee domain
2. **ShiftRecord Service Layer**: All business logic (conflict detection, vacation checks, RBAC) in service; routers HTTP-only
3. **Calendar Component**: React hook + Context for state management with react-big-calendar
4. **Tenant Isolation**: All queries filter by `tenant_id` from JWT
5. **Multi-language**: UI in Spanish (es-ES); dates in Europe/Madrid timezone

---

## Technical Context

**Language/Version**: Python 3.12 (backend), React 19 + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Pydantic v2 (backend); react-big-calendar or react-calendar (frontend)
**Storage**: PostgreSQL 16 with Alembic migrations
**Testing**: pytest + httpx (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Web browser (desktop/tablet)
**Project Type**: Full-stack web application (SPA + REST API)
**Performance Goals**: <200ms p95 API response; calendar renders in <3s; month navigation <500ms
**Constraints**: Tablet-responsive (iPad-size), 95% error-free operations, <2min per assignment
**Scale/Scope**: 50+ concurrent users, 500+ employees, 1000+ shift records/month

---

## Constitution Check ✅

**GATE: All 10 principles PASS. Design adheres to constitution before Phase 0.**

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | Routers → Services → Models; no DB in frontend |
| II. Strict Modularity | ✅ PASS | Single files per concern (shift_record.py, shift_record_service.py, shifts.py); no circular deps |
| III. Strict Type Safety | ✅ PASS | Pydantic models backend, TypeScript strict frontend; mypy --strict will pass |
| IV. Production-Ready | ✅ PASS | Config from .env, Alembic migrations, JSON logging, seed.py |
| V. Security-First | ✅ PASS | JWT auth, RBAC at service layer, tenant isolation, audit logging |
| VI. Error Handling | ✅ PASS | DomainException hierarchy; no stack traces in API responses |
| VII. Quality Gates | ✅ PASS | mypy, ruff, pytest, eslint all configured |
| VIII. Tenant-Aware | ✅ PASS | All queries filter by tenant_id from JWT |
| IX. Localization | ✅ PASS | UI in Spanish; timezone Europe/Madrid |
| X. Performance | ✅ PASS | Indexes on (tenant_id, date); pagination support |

**Conclusion**: Design ready for Phase 0 research. No violations identified.

---

## Project Structure

### Documentation (this feature)

```text
specs/004-shift-roster-calendar/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
├── contracts/           # Phase 1 output (to be created)
│   ├── shift-endpoints.md
│   └── shift-schemas.md
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
backend/app/
├── models/
│   └── shift_record.py              # ShiftRecord entity + ShiftType enum
├── services/
│   └── shift_record_service.py      # CRUD, conflict detection, vacation checks
├── routers/
│   └── shifts.py                    # API endpoints (GET, POST, PUT, DELETE)
├── schemas/
│   └── shift.py                     # ShiftCreate, ShiftUpdate, ShiftResponse DTOs
└── common/
    └── exceptions.py                # ShiftConflictError, VacationOverlapWarning

frontend/src/
├── views/
│   └── ShiftRosterCalendar.tsx      # Main calendar page view
├── components/
│   ├── CalendarGrid.tsx             # Calendar month grid (react-big-calendar wrapper)
│   └── ShiftAssignmentDialog.tsx    # Modal for shift assignment
├── hooks/
│   └── useShiftCalendar.ts          # State & logic hook
├── services/
│   └── shiftService.ts              # API client wrapper
└── types/
    └── shift.ts                     # TypeScript interfaces
```

**Structure Decision**: Web application (backend + frontend). This follows the existing architecture and enables independent scaling. Backend provides REST API for shift CRUD; frontend consumes via react-big-calendar calendar UI.

---

## Complexity Tracking

**No Constitution violations.** All 10 principles fully satisfied:
- Clean architecture maintained (routers → services → models)
- Strict modularity enforced (single files, no circular deps)
- Type safety on backend (Pydantic) and frontend (TypeScript)
- Production-ready deployment (config-driven, migrations, logging)
- Security-first (RBAC at service, tenant isolation, audit)

---

## Phase 0: Research Tasks

### Task 1: Verify ShiftType Modeling
- **Goal**: Confirm if ShiftType enum exists or needs creation
- **Checks**:
  - `backend/app/models/employee.py` — Search for "shift" enum
  - `backend/alembic/versions/` — Check recent migrations
  - `backend/app/seed.py` — Check if shift types seeded
- **Output**: Document decision in research.md

### Task 2: React-Big-Calendar Integration Patterns
- **Goal**: Best practices for month-view with custom event rendering
- **Research**:
  - Custom event components (ShiftEventComponent)
  - Handling multi-day events (single shift per day, no multi-day)
  - Responsive behavior on tablet
- **Output**: Code patterns in research.md

### Task 3: Vacation Request Integration
- **Goal**: Query patterns and performance implications
- **Checks**:
  - `backend/app/services/vacation_request_service.py` — Available methods
  - Query cost: SELECT VacationRequest WHERE (tenant_id, employee_id, date_range)
  - Join cost with ShiftRecord
- **Output**: Integration strategy in research.md

### Task 4: Database Indexing Strategy
- **Goal**: Optimal indexes for shift queries
- **Design**:
  - Index 1: (tenant_id, date) — for monthly roster queries
  - Index 2: (tenant_id, employee_id, date) — for employee schedules
  - Index 3: (tenant_id, shift_type) — for filtering by shift type
- **Output**: Alembic migration strategy in research.md

---

## Phase 1: Design Deliverables (Planned)

### 1. data-model.md
- **ShiftRecord** entity definition (fields, constraints, validation)
- **ShiftType** enum (morning, afternoon, night, etc.)
- Relationships (Employee → ShiftRecord, ShiftRecord ↔ VacationRequest)
- Unique constraints (unique per employee per day)
- Soft delete strategy (if applicable)

### 2. contracts/shift-endpoints.md
- `GET /api/v1/shifts?month=2026-03&employee_id={id}` — List shifts
- `POST /api/v1/shifts` — Create shift
- `PUT /api/v1/shifts/{id}` — Update shift
- `DELETE /api/v1/shifts/{id}` — Delete shift
- Pagination, filtering, error responses

### 3. contracts/shift-schemas.md
- Request/response schemas (Pydantic + TypeScript)
- Error format (standard DomainException)
- Status codes (200, 201, 400, 409, 404, 403)

### 4. quickstart.md
- "5-min guide" for developers
- File locations, import patterns
- Running tests, local development
- Common tasks (add new field, add endpoint)

---

## Dependencies & Prerequisites

### Backend (Already Present ✅)
- FastAPI, SQLModel, Pydantic v2, python-jose (JWT), passlib (bcrypt)
- Employee model, VacationRequest model, authentication middleware
- Alembic migration system

### Frontend (May Need Install ⚠️)
- `npm install react-big-calendar` — If not present
- `npm install date-fns` — For date utilities
- `npm install react-modal` or equivalent (if custom dialog needed)

### Database Prerequisites
- Employee table (exists ✅)
- VacationRequest table (exists ✅)
- ShiftRecord table (may need Alembic migration)
- Indexes on (tenant_id, date), (tenant_id, employee_id, date)

### Feature Prerequisites
- Employee CRUD API working ✅
- VacationRequest model accessible ✅
- Authentication/RBAC system working ✅
- Tenant isolation enforced in queries ✅
- Error handling (DomainException) in place ✅

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| ShiftRecord table missing | Low | High | Alembic migration ready in Phase 1 |
| ShiftType not yet modeled | Medium | Medium | Research Phase 0; add if missing |
| react-big-calendar version incompatibility | Low | Medium | Prototype integration early |
| Vacation query performance | Low | Medium | Index (tenant_id, employee_id, date) |
| Conflict detection missed | Low | High | Implement at service layer + UI |
| RBAC not enforced | Low | High | Service-layer checks; unit tests |
| Timezone edge cases | Low | Low | Use tenant config; Europe/Madrid default |

---

## Success Criteria (from spec.md)

- ✅ SC-001: Roster view in <30 sec
- ✅ SC-002: Assignment in <2 min
- ✅ SC-003: Calendar renders without lag
- ✅ SC-004: 100% conflict detection
- ✅ SC-005: Persistence across page reloads
- ✅ SC-006: Tablet-responsive display
- ✅ SC-007: 95% error-free operations
- ✅ SC-008: 90% moderator satisfaction

---

## Next Steps

1. ⏭️ **Phase 0 (Research)**: Investigate 4 research tasks; consolidate in research.md
2. ⏭️ **Phase 1 (Design)**: Generate data-model.md, contracts/, quickstart.md, update agent context
3. ⏭️ **Phase 2 (Tasks)**: Run `/speckit.tasks` to generate dependency-ordered implementation tasks
4. ⏭️ **Implementation**: Execute tasks in dependency order

---

## References

- **Constitution**: `specs/001-kitchen-staff-mgmt/constitution.md`
- **Spec**: `specs/004-shift-roster-calendar/spec.md`
- **Existing Models**: `backend/app/models/` (Employee, VacationRequest)
- **Existing Services**: `backend/app/services/` (employee_service, vacation_request_service)
- **React-Big-Calendar**: https://jquense.github.io/react-big-calendar/
- **Date-FNS**: https://date-fns.org/
