# Implementation Plan: Automatic Shift-Based Time Tracking

**Branch**: `008-automatic-time-tracking` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-automatic-time-tracking/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Implement automatic time tracking for employees based on assigned shifts. System will automatically create TimeEntry records during shift dates, calculate work statistics (total hours, days worked, departmental grouping) from shift assignments. TimeEntry model will support future manual tracking via a `source` field (shift vs. manual). This phase focuses on automatic tracking only; manual clock in/out is deferred to Phase 2.

## Technical Context

**Language/Version**: Python 3.12 (backend) + React 19 + TypeScript 5.8+ (frontend)
**Primary Dependencies**:
  - Backend: FastAPI, SQLModel (ORM), Alembic (migrations), pytest + httpx (testing)
  - Frontend: React Router v7, Recharts (charts for statistics), Axios (HTTP)
**Storage**: PostgreSQL 16 (database), migrations via Alembic
**Testing**: pytest (backend unit/integration), Vitest + React Testing Library (frontend)
**Target Platform**: Web service (FastAPI) + React SPA, Linux server deployment
**Project Type**: Web service + SPA (Kitchen Staff Management MVP)
**Performance Goals**: Statistics queries <2 seconds for 50+ employees over 1-month period; batch job completion within 24 hours
**Constraints**:
  - Timezone-aware shift times (tenant timezone)
  - Multi-tenant aware (single tenant MVP, but design for future expansion)
  - Type safety: mypy --strict, TypeScript strict mode
  - RBAC: Admin/Moderator can view stats; Empleado cannot access automatic tracking UI
**Scale/Scope**: Single tenant MVP (ILPI), ~20-50 employees, stats dashboard + admin reports

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Clean Architecture ✅
- **Routers**: HTTP endpoints (serialization, response formatting) — will create `/time-tracking` endpoints
- **Services**: Business logic for automatic entry creation and statistics — will extend `time_tracking_service.py`
- **Models**: SQLModel TimeEntry entity (pure domain, no infrastructure coupling)
- **Database**: ORM queries in services only, never in routers
- **Decision**: No circular dependencies; TimeEntry service depends on ShiftRecord and Employee services

### II. Strict Modularity ✅
- **Single Responsibility**: TimeEntry creation (service) separate from statistics calculation (separate service method)
- **No Circular Dependencies**: Dependency flow: Routers → TimeTrackingService → ShiftRecord/Employee services
- **Shared Code**: Exceptions, schemas in `backend/app/common/` (e.g., InvalidShiftError)
- **Model Re-export**: TimeEntry added to `backend/app/models/__init__.py` for Alembic migrations

### III. Strict Type Safety ✅
- **Backend**: All function signatures type-hinted, Pydantic v2 schemas for TimeEntry, mypy --strict
- **Frontend**: TypeScript strict mode for statistics components
- **Enums**: TimeEntrySource enum (shift, manual) for source field
- **No `any` types**: All code type-safe or documented

### IV. Production-Ready Deployment ✅
- **Configuration**: Batch job schedule via `.env` (BATCH_TIME_TRACKING_HOUR)
- **Migrations**: Alembic migration for TimeEntry table (auto-generated from SQLModel)
- **Logging**: Structured JSON logging for automatic entry creation (employee_id, shift_id, hours_worked)
- **Seed Data**: No new seed data needed; feature works with existing shift assignments

### V. Security-First ✅
- **Authentication**: TimeEntry endpoints require JWT; RBAC enforced at service layer
- **RBAC**: Admin/Moderator can view all statistics; Empleado cannot access automatic tracking endpoints
- **Audit Logging**: Log all automatic entry creations (employee_id, tenant_id, created_by=system)
- **Data Protection**: TimeEntry includes employee_id for multi-tenant isolation (WHERE tenant_id = current_tenant)

**Result**: ✅ **PASS** — Feature aligns with all 5 constitutional principles. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   ├── time_entry.py          # NEW: TimeEntry SQLModel entity
│   │   └── __init__.py            # UPDATED: Re-export TimeEntry for Alembic
│   ├── services/
│   │   ├── time_tracking_service.py    # UPDATED: Add automatic entry generation + statistics
│   │   └── __init__.py
│   ├── routers/
│   │   ├── time_tracking.py       # UPDATED: Add statistics endpoints (admin/moderator only)
│   │   └── __init__.py
│   ├── schemas/
│   │   ├── time_tracking.py       # NEW: Pydantic DTOs (TimeEntryCreate, TimeEntryResponse, StatisticsResponse)
│   │   └── __init__.py
│   ├── common/
│   │   ├── exceptions.py          # UPDATED: Add InvalidShiftError, DuplicateTimeEntryError
│   │   └── __init__.py
│   └── main.py                    # UPDATED: Register batch job for automatic entry generation
├── alembic/
│   └── versions/
│       └── [new migration]        # NEW: Create time_entry table
└── tests/
    ├── integration/
    │   └── test_time_tracking.py  # NEW: Integration tests for automatic entry creation + statistics
    └── unit/
        └── test_time_tracking_service.py  # NEW: Unit tests for service logic

frontend/
├── src/
│   ├── components/
│   │   └── time-tracking/
│   │       └── StatisticsCard.tsx # NEW: Display work statistics (hours, days worked, breakdown)
│   ├── views/
│   │   └── AdminStatistics.tsx    # NEW: Admin view for all employee statistics
│   ├── services/
│   │   └── statisticsService.ts   # NEW: API calls for statistics endpoints
│   └── types/
│       └── timeTracking.ts        # NEW: TypeScript interfaces (TimeEntry, Statistics, etc.)
```

**Structure Decision**: Uses web application layout (Option 2). Backend extends existing FastAPI structure with TimeEntry model, services, and routers. Frontend adds admin statistics view component. No circular dependencies; statistics service depends on existing shift and employee services.

## Complexity Tracking

**No constitution violations identified.** Feature aligns with all 5 architectural principles. No complexity justifications needed.

---

## Phase 0: Research & Clarifications

### Key Design Decisions to Research

1. **Automatic Entry Generation Timing**
   - **Decision**: Nightly batch job (e.g., 01:00) vs. real-time trigger on shift date
   - **Rationale**: Batch job is simpler, reduces DB load, sufficient for statistics (not real-time clock tracking)
   - **Implementation**: APScheduler or Celery scheduled task; run daily at configurable time from `.env`

2. **Idempotency Strategy**
   - **Decision**: Check for existing TimeEntry before creation; upsert vs. skip duplicate
   - **Rationale**: Prevents double-counting if batch job runs twice; ensures data consistency
   - **Implementation**: Unique constraint on (employee_id, shift_date, shift_type) to prevent duplicates at DB level

3. **Multi-Shift Day Handling**
   - **Decision**: Create separate TimeEntry per shift vs. combine into single daily entry
   - **Rationale**: Separate entries provide better auditability and future manual tracking support
   - **Implementation**: One TimeEntry per ShiftRecord assignment; aggregate in statistics queries

4. **Timezone Handling in Batch Job**
   - **Decision**: Store all times in UTC; use tenant timezone for shift definitions
   - **Rationale**: Aligns with Principle IV (Production-Ready); existing codebase uses UTC for DB
   - **Implementation**: Shift times stored in tenant timezone; convert to UTC for DB storage; convert back for display

5. **Statistics Aggregation Performance**
   - **Decision**: Compute on-demand from TimeEntry table vs. materialized view vs. cached summaries
   - **Rationale**: On-demand sufficient for <2sec requirement with proper indexes (employee_id, shift_date, tenant_id)
   - **Implementation**: Indexed queries; add DB indexes if needed after testing

### Research Output
✅ All decisions documented. No external research needed; follows existing project patterns.

---

## Phase 1: Design Artifacts (Data Model, Contracts, Quickstart)
