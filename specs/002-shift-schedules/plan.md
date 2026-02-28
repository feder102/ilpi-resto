# Implementation Plan: Shift Schedule Configuration & Auto Calculation

**Branch**: `002-shift-schedules` | **Date**: 2026-02-28 | **Spec**: [specs/002-shift-schedules/spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-shift-schedules/spec.md`

**Note**: This plan is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement **ShiftType** entity and CRUD endpoints to configure four standard shift types (Mañana, Noche, Cortado, Corrido) with automatic hour calculation. Support single-window, split-window, and dynamic-close-time shifts. Enhance Team CRUD to reference ShiftType instead of raw times. Enable admins to define organizational shift standards once, with system automatically calculating total hours for all shift complexities including midnight-spanning and split shifts.

## Technical Context

**Language/Version**: Python 3.12 (backend) + React 19 + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel (ORM), Pydantic v2, PostgreSQL 16, Alembic (migrations)
**Storage**: PostgreSQL 16 (primary), single-tenant MVP (multi-tenant ready via tenant_id)
**Testing**: pytest + httpx (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Linux server (backend), modern browsers (frontend)
**Project Type**: Web service (REST API backend + SPA frontend)
**Performance Goals**: API endpoints <200ms (p95), list endpoints paginated (default 20, max 100)
**Constraints**: HTTPS/TLS enforced, CORS explicit whitelist, rate limiting 10 req/min auth, 100 req/min others
**Scale/Scope**: 50 concurrent users, 500 employees, 1000+ shift records/month, RBAC (Admin/Moderador/Empleado)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅

- **Routers** (new `POST /shift-types`, `GET /shift-types/{id}`, etc.): HTTP serialization + role checks only
- **Services** (new `shift_type_service`): All business logic (validation, uniqueness, team assignment checks, deletion safety)
- **Models** (new `ShiftType` SQLModel): Pure domain entity (zero FastAPI coupling)
- **No DB queries in routers**: All queries delegated to shift_type_service
- **Team service updates**: Enhanced to validate shift_type references and include calculated `total_hours`

**Verdict**: ✅ PASS — Dependency flow: Router → Service → Model. No infrastructure leakage.

### II. Strict Modularity ✅

- **Single responsibility**: `ShiftType` model, `shift_type_service`, `shift_type_router` (one file each)
- **No circular dependencies**: ShiftType service depends on models + common exceptions; Team service depends on ShiftType service (one-way)
- **Shared code in `common/`**: Exceptions (DuplicateError, NotFoundError, InvalidReferenceError) reused
- **Model aggregation**: `backend/app/models/__init__.py` re-exports ShiftType for Alembic metadata discovery

**Verdict**: ✅ PASS — Clear module boundaries, proper dependency direction.

### III. Strict Type Safety ✅

- **ShiftType model**: Full type hints (SQLModel with Field constraints)
- **Pydantic DTOs**: ShiftTypeCreate, ShiftTypeUpdate, ShiftTypeResponse (pydantic v2)
- **Enum for shift types**: `ShiftTypeEnum` (Mañana, Noche, Cortado, Corrido) prevents invalid names
- **mypy --strict**: All function signatures typed, no `Any` without justification
- **Team schema updates**: shift_type now references enum or UUID (strongly typed)

**Verdict**: ✅ PASS — Full type coverage, enums used for categorical fields, Pydantic v2 DTOs.

### IV. Production-Ready Deployment ✅

- **Alembic migration**: New `shift_type` table with all fields versioned and reversible
- **Seed data**: `backend/app/seed.py` creates default shift types (Mañana, Noche, Cortado, Corrido) on tenant initialization
- **Config-driven**: Shift times and break durations configurable via API, not hardcoded
- **Structured logging**: Shift type CRUD operations logged with {timestamp, level, module, actor_id, action, tenant_id}
- **Zero hardcoded secrets**: No shift config in source; all via DB and API

**Verdict**: ✅ PASS — Fully migratable, seeded, configured, logged.

### V. Security-First ✅

- **RBAC enforcement**: Only Admin/Moderador can POST/PUT/DELETE shift types (service layer check)
- **Tenant isolation**: All queries filter by tenant_id from JWT (verified via dependency injection)
- **Uniqueness per tenant**: Unique constraint on (tenant_id, name) prevents cross-tenant pollution
- **Deletion safety**: Service prevents deletion if teams assigned (no orphaned references)
- **Audit logging**: All shift type config changes logged (create, update, delete with actor_id, timestamp)

**Verdict**: ✅ PASS — RBAC, tenant isolation, validation, audit logging all in place.

**Overall Gate Result**: ✅ **PASS** — Feature complies with all 5 architectural principles. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-shift-schedules/
├── spec.md              # Feature specification ✓ (completed)
├── plan.md              # This file (Phase 0/1 output)
├── research.md          # Phase 0 output (dependencies, best practices) — TO BE GENERATED
├── data-model.md        # Phase 1 output (ShiftType entity, relationships) — TO BE GENERATED
├── quickstart.md        # Phase 1 output (API examples, setup guide) — TO BE GENERATED
├── contracts/           # Phase 1 output (API contract specifications) — TO BE GENERATED
│   ├── shift-types-api.md
│   └── team-enhancements.md
├── checklists/
│   └── requirements.md   # Quality validation ✓ (completed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code Structure (Backend)

```text
backend/
├── app/
│   ├── models/
│   │   ├── shift_type.py        # NEW: ShiftType SQLModel entity
│   │   ├── team.py              # MODIFIED: Add shift_type_id FK, remove shift_start/shift_end
│   │   └── __init__.py          # MODIFIED: Export ShiftType for Alembic
│   │
│   ├── schemas/
│   │   ├── shift_type.py        # NEW: ShiftTypeCreate, ShiftTypeUpdate, ShiftTypeResponse DTOs
│   │   └── team.py              # MODIFIED: Update TeamCreate/TeamUpdate to use shift_type ref
│   │
│   ├── services/
│   │   ├── shift_type_service.py  # NEW: Shift type CRUD, validation, team assignment checks
│   │   └── team_service.py        # MODIFIED: Validate shift_type refs, calculate total_hours
│   │
│   ├── routers/
│   │   ├── shift_types.py       # NEW: FastAPI endpoints for shift type CRUD
│   │   └── teams.py             # MODIFIED: Update Team response to include total_hours
│   │
│   ├── common/
│   │   ├── exceptions.py        # MODIFIED: Add InvalidShiftTypeError, ShiftTypeInUseError
│   │   └── enums.py             # NEW or MODIFIED: Add ShiftTypeEnum (Mañana, Noche, Cortado, Corrido)
│   │
│   ├── database.py              # No changes (existing session management)
│   ├── seed.py                  # MODIFIED: Seed default shift types for tenant
│   └── main.py                  # MODIFIED: Include shift_types router
│
├── alembic/
│   └── versions/
│       └── [NEXT_REV]_add_shift_types_table.py  # NEW: Alembic migration for shift_type table
│
└── tests/
    ├── test_shift_types.py      # NEW: Unit & integration tests for shift type CRUD
    └── test_teams_enhanced.py   # MODIFIED: Tests for Team with shift_type refs
```

### Source Code Structure (Frontend)

```text
frontend/
├── src/
│   ├── components/
│   │   └── ShiftTypeForm.tsx    # NEW: Form for creating/editing shift types (split windows)
│   │
│   ├── views/
│   │   └── ShiftConfiguration.tsx  # NEW: Admin page for shift type management
│   │
│   ├── services/
│   │   └── shiftTypesApi.ts    # NEW: API client for shift-types endpoints
│   │
│   └── types/
│       ├── shift-types.ts       # NEW: TypeScript interfaces (ShiftType, TimeWindow, etc)
│       └── team.ts              # MODIFIED: Update Team type to reference ShiftType
│
└── tests/
    └── shift-type-integration.test.tsx  # NEW: Tests for shift type CRUD via API
```

**Structure Decision**: Web application (backend + frontend). Backend uses Clean Architecture (Routers → Services → Models). Frontend uses component-based structure with custom hooks and context. All new code follows project conventions: no circular deps, strict type safety, production-ready migrations.

## Complexity Tracking

✅ **No violations** — Feature complies with all constitutional principles. No complexity justification needed.

---

## Phase 0: Research & Dependencies

**Status**: READY FOR RESEARCH PHASE

### Research Tasks

1. **Hour Calculation for Split Shifts & Midnight Spans**
   - Task: Determine best approach for calculating hours across midnight boundaries and split time windows
   - Context: Cortado (12:30-16:30, 18:30-22:30 = 8 hrs), Noche (17:00-Cierre spanning midnight)
   - Research: Time arithmetic libraries, timezone-aware calculations in Python, edge cases

2. **PostgreSQL Time Range Types vs. Storing Individual Windows**
   - Task: Evaluate whether to use PostgreSQL `tsrange` or store time windows as JSON/array
   - Context: Support for split shifts and nullable end times (dynamic close)
   - Research: SQLModel + SQLAlchemy support, query patterns, migration complexity

3. **API Design for Split Shift Time Windows**
   - Task: Define request/response format for time windows in create/update shift type endpoints
   - Context: Cortado has 2 windows; single-window shifts (Mañana) have 1; dynamic-close shifts (Noche) have 1 with flag
   - Research: JSON schema design, validation patterns, API usability

### Dependencies (No NEEDS CLARIFICATION — all resolved in spec)

- ✅ Midnight spanning support: CONFIRMED (use expected_hours for display)
- ✅ Split shift support: CONFIRMED (Cortado defined with 2 windows)
- ✅ Dynamic close time: CONFIRMED (use expected_hours, actual via timeclocks)
- ✅ Shift type enum: CONFIRMED (Mañana, Noche, Cortado, Corrido)

---

## Phase 1: Design & Contracts

**Prerequisites**: Phase 0 research complete (research.md finalized)

### Deliverables (To Be Generated)

#### 1. `data-model.md`
- **ShiftType** entity: fields (id, tenant_id, name, type enum, time_windows array, uses_dynamic_close, expected_hours, etc)
- **Team** modifications: shift_type_id FK, remove shift_start/shift_end, add calculated total_hours property
- Validation rules: unique (tenant_id, name), shift_type FK reference, window ordering, hour constraints
- State transitions: soft delete via is_active flag
- Relationships: Team.many → ShiftType.one

#### 2. `contracts/shift-types-api.md`
- **GET /shift-types**: List all shift types for tenant (paginated)
- **GET /shift-types/{id}**: Retrieve single shift type with full details
- **POST /shift-types**: Create new shift type (Admin/Moderador only)
  - Request schema: name, type enum, time_windows array, expected_hours, description
  - Response: Full ShiftType with calculated total_hours verification
- **PUT /shift-types/{id}**: Update shift type (Admin/Moderador only)
- **DELETE /shift-types/{id}**: Delete shift type with team assignment check (Admin only)
  - Error handling: prevent deletion if teams assigned, return list of affected teams

#### 3. `contracts/team-enhancements.md`
- **POST /teams**: Modified to accept shift_type (name or UUID)
  - Request: name, department, shift_type, team_members (optional)
  - Response: Include total_hours calculated from shift_type
  - Validation: Verify shift_type exists and is active
- **PUT /teams/{id}**: Modified to support shift_type change
- **GET /teams/{id}**: Response includes total_hours and shift details (time windows)

#### 4. `quickstart.md`
- Step-by-step guide: Create shift types, assign to teams, verify calculations
- Example requests/responses: Creating Cortado with 2 windows, Noche with dynamic close
- Frontend examples: ShiftConfiguration page, ShiftTypeForm component
- Testing: cURL examples and pytest test patterns

#### 5. API Response Examples
```json
// ShiftType response (Cortado)
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {"start": "12:30", "end": "16:30"},
    {"start": "18:30", "end": "22:30"}
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "total_hours": 8.0,
  "is_active": true,
  "created_at": "2026-02-28T...",
  "updated_at": "2026-02-28T..."
}
```

#### 6. Frontend TypeScript Types
- `ShiftType` interface with TimeWindow array
- `ShiftTypeEnum` type union (Mañana | Noche | Cortado | Corrido)
- `Team` interface updated with shift_type reference and total_hours field

---

## Implementation Strategy

1. **Database First**: Create Alembic migration + ShiftType model
2. **Backend Services**: Implement shift_type_service with all business logic
3. **Backend API**: Add routers + update Team routers
4. **Update Seed**: Add default shift types to seed.py
5. **Frontend**: Add ShiftConfiguration view + ShiftTypeForm component
6. **Testing**: Unit tests (service logic) + integration tests (API contracts)
