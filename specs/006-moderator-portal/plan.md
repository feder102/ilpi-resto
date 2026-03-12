# Implementation Plan: Moderator Portal (Feature 006)

**Branch**: `006-moderator-portal` | **Date**: 2026-03-09 | **Spec**: [Feature 006 Specification](./spec.md)
**Input**: Feature specification from `/specs/006-moderator-portal/spec.md`

## Summary

Feature 006 adds a comprehensive Moderator Portal enabling team leaders to manage shifts, approve vacations, and view attendance reports for their department. This feature is built on the existing shift roster and vacation request infrastructure (Feature 004 & 005) and extends it with moderator-specific views and permissions. The implementation focuses on department-scoped access control, real-time shift assignment with conflict detection, and vacation approval workflows with audit trails. All features follow the Clean Architecture and Security-First principles from the project constitution, with role-based access enforced at the service layer and tenant isolation on every database query.

## Technical Context

**Language/Version**: Python 3.12 (backend) + TypeScript 5.8+ (frontend)
**Primary Dependencies**:
  - Backend: FastAPI, SQLModel, python-jose, passlib[bcrypt], Pydantic v2
  - Frontend: React 19, React Router v7, Axios, Recharts, Lucide Icons
**Storage**: PostgreSQL 16 (shared across all features)
**Testing**: pytest (backend) + Vitest (frontend)
**Target Platform**: Linux server + modern web browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (REST API + Single-Page Application)
**Performance Goals**:
  - Roster load: < 2 seconds
  - Vacation approval: < 30 seconds (including review)
  - Shift assignment: < 45 seconds per employee
  - Report generation: < 5 seconds
**Constraints**:
  - API response time: < 200ms (p95)
  - Department-scoped access (no cross-department data leakage)
  - Shift assignment with conflict detection (prevent overlaps with vacations)
  - Audit trail recording for all approvals/rejections
**Scale/Scope**: Single-tenant MVP supporting up to 500 employees per department, 5-10 moderators per organization

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Principle I: Clean Architecture ✅
- **Routers**: HTTP-only concern handling (request deserialization, response formatting, role checks)
  - `backend/app/routers/moderator.py` for all moderator endpoints
- **Services**: All business logic (vacation approval, shift assignment, conflict detection)
  - Extend `VacationService`, create `ModeratorShiftService`
  - Service layer enforces department-scoped access
- **Models**: Pure domain entities (User, Employee, VacationRequest, ShiftRecord)
  - No infrastructure coupling; all ORM operations in services
- **Status**: ✅ PASS - New routes → services follow established pattern from Features 004/005

### Principle II: Strict Modularity ✅
- **Single Responsibility**: Separate services for vacations, shifts, reporting
- **No Circular Dependencies**: DAG verified across routers → services → models
- **Shared Code**: Exceptions and utilities in `backend/app/common/`
- **Model Aggregation**: All models re-exported in `backend/app/models/__init__.py` for Alembic
- **Status**: ✅ PASS - Feature 006 extends existing modules without circular dependencies

### Principle III: Strict Type Safety ✅
- **Backend**: All function signatures have type hints, Pydantic v2 models for DTOs
  - `mypy --strict` will enforce zero errors
- **Frontend**: TypeScript strict mode enabled
  - New types in `frontend/src/types/models.ts` for moderator views
  - No `any` types without justification
- **Enums**: Role (Admin/Moderador/Empleado), Department, VacationStatus already defined
- **Status**: ✅ PASS - No type safety violations

### Principle IV: Production-Ready Deployment ✅
- **Configuration**: All env-specific values from `.env` files (no hardcoded values)
- **Zero Hardcoded Secrets**: JWT secrets, database URLs managed via environment
- **Structured JSON Logging**: New moderator actions logged with context (moderator_id, action, details)
- **Database Migrations**: All schema changes via Alembic (no manual SQL)
- **Seed Data**: `backend/app/seed.py` updated with moderador user (already done)
- **Status**: ✅ PASS - No new infrastructure required beyond existing patterns

### Principle V: Security-First ✅
- **Authentication**: JWT tokens already in place; moderador role verified per request
- **Authorization**: Service layer enforces department-scoped access
  - Every query filters by `tenant_id` and employee's department
  - Moderator cannot approve/assign shifts to employees outside their department
- **RBAC**: Moderador role with specific permissions (approve vacations, assign shifts, view reports)
- **Data Protection**: TLS/SSL enforced, CORS explicit, rate limiting (100 req/min standard)
- **Audit Logging**: Vacation approvals/rejections recorded with moderador identity and timestamp
- **Tenant Isolation**: Every moderator query includes `tenant_id` filter
- **Status**: ✅ PASS - Security model aligns with constitution principles

**Overall**: ✅ **CONSTITUTION PASSED** - Feature 006 adheres to all 5 architectural principles

## Project Structure

### Documentation (this feature)

```text
specs/006-moderator-portal/
├── spec.md              # Feature specification (user stories, requirements)
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0 output (design decisions & rationale)
├── data-model.md        # Phase 1 output (entity relationships)
├── quickstart.md        # Phase 1 output (developer reference)
├── contracts/           # Phase 1 output (API contracts)
│   └── moderator-api.md # REST endpoints for moderator features
├── checklists/
│   └── requirements.md   # Specification quality validation
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (Web Application)

**Backend** (`backend/app/`):
```text
backend/app/
├── models/
│   ├── __init__.py      # Re-exports (includes ShiftRecord, VacationRequest)
│   └── [existing models]
├── schemas/
│   ├── vacation.py      # [existing DTOs]
│   ├── shift.py         # [existing DTOs]
│   └── moderator.py     # NEW: VacationApprovalRequest, ShiftAssignmentRequest, ReportRequest
├── services/
│   ├── __init__.py
│   ├── vacation_service.py    # [extends for moderator approvals]
│   ├── shift_service.py       # [extends for moderator assignments]
│   └── moderator_service.py   # NEW: Department-scoped queries, conflict detection
├── routers/
│   ├── __init__.py
│   ├── auth.py          # [existing]
│   ├── vacations.py     # [existing]
│   ├── shifts.py        # [existing]
│   └── moderator.py     # NEW: Moderator endpoints (roster, approvals, assignments, reports)
├── common/
│   ├── exceptions.py    # [existing exception hierarchy]
│   ├── schemas.py       # [existing shared schemas]
│   └── security.py      # [existing auth utilities]
├── dependencies.py      # [existing FastAPI dependencies]
├── main.py              # [existing app initialization]
└── seed.py              # [updated with moderador user]
```

**Frontend** (`frontend/src/`):
```text
frontend/src/
├── views/
│   ├── ModeratorDashboard.tsx      # NEW: Main moderator portal view
│   ├── ModeratorRoster.tsx         # NEW: Shift roster calendar
│   ├── VacationApproval.tsx        # NEW: Vacation request management
│   ├── ShiftAssignment.tsx         # NEW: Assign shifts to employees
│   └── ModeratorReports.tsx        # NEW: Attendance & vacation reports
├── components/
│   ├── moderator/
│   │   ├── RosterCalendar.tsx      # NEW: Reusable calendar component
│   │   ├── VacationRequestList.tsx # NEW: List of pending requests
│   │   ├── ShiftAssignmentForm.tsx # NEW: Shift assignment UI
│   │   └── ReportGenerator.tsx     # NEW: Report dashboard
│   └── [existing components]
├── context/
│   ├── AuthContext.tsx             # [existing]
│   └── ModeratorContext.tsx        # NEW: Department, permissions state
├── hooks/
│   └── useModeratorData.ts         # NEW: Data fetching for moderator features
├── services/
│   ├── moderatorService.ts         # NEW: API calls for moderator endpoints
│   └── [existing services]
├── types/
│   └── models.ts                   # [extends with moderator-specific types]
└── App.tsx                         # [integrates ModeratorRoute wrapper]
```

**Structure Decision**: **Web Application Pattern (Option 2)** - Extends existing backend/frontend separation with new moderator-specific routers, services, and React components. All new code follows established patterns from Features 004/005. No circular dependencies; dependency flow: Frontend → API → Services → Models.

## Complexity Tracking

> **No violations detected** - Feature 006 adheres to all constitution principles. This section remains empty.

All architectural decisions are justified by existing patterns from Features 004 and 005:
- Service layer enforces business rules (clean architecture)
- Department-scoped access (security-first tenant isolation)
- Type-safe DTOs and models (strict type safety)
- Configuration via `.env` files (production-ready deployment)
- Alembic migrations for schema changes (version control)
