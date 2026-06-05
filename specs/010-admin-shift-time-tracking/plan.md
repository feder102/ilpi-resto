# Implementation Plan: Admin-Driven Shift Hours & Extra Hours

**Branch**: `010-admin-shift-time-tracking` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-admin-shift-time-tracking/spec.md`

## Summary

Remove the employee manual clock-in/out flow entirely (UI, endpoints, and the `TimeRecord` model/table). Worked hours derive exclusively from shifts assigned by Admin/Moderador via the existing `TimeEntry` mechanism (Feature 008). Employees keep a read-only view of their monthly worked hours. Add the ability for Admin/Moderador to register **extra hours** (overtime) for an employee as a **separate category** (`source="extra"`), reflected separately in statistics and dashboards.

## Technical Context

**Language/Version**: Python 3.12 (backend) + React 19 + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Alembic, pytest (backend); React Router v7, Recharts, Axios (frontend)
**Storage**: PostgreSQL 16, migrations via Alembic
**Testing**: pytest (backend), Vitest + React Testing Library (frontend)
**Project Type**: Web service (FastAPI) + React SPA
**RBAC**: Cargar turnos y horas extra → Admin/Moderador; estadísticas propias → Empleado (read-only)

## Constitution Check

### I. Clean Architecture ✅
- Routers HTTP-only; business logic (creación de horas extra, estadísticas) en `time_tracking_service.py`; `TimeEntry` modelo puro.

### II. Strict Modularity ✅
- Se elimina `TimeRecord` y sus funciones de fichaje; la clase `TimeTrackingService` concentra estadísticas y horas extra. Sin dependencias circulares.

### III. Strict Type Safety ✅
- Type hints + Pydantic v2 (`ExtraHoursCreate`), mypy --strict. Enum `TimeEntrySource` amplía a `extra`. TS strict en frontend.

### IV. Production-Ready Deployment ✅
- Cambio de esquema vía migración Alembic (drop `time_record`, `time_entries` nullables + `note`, valor de enum `extra`).

### V. Security-First ✅
- RBAC en service layer (Empleado prohibido de cargar horas extra). Audit logging de creación/eliminación de horas extra. Tenant isolation en todas las queries.

**Result**: ✅ PASS — sin violaciones.

## Project Structure (changes)

```text
backend/app/
├── models/
│   ├── time_record.py        # DELETED
│   ├── time_entry.py         # MODIFIED: source += extra; start/end nullable; note
│   └── __init__.py           # MODIFIED: drop TimeRecord import/export
├── schemas/
│   ├── time_tracking.py      # MODIFIED: drop clock-in/out schemas; add ExtraHoursCreate; extra_hours fields
│   └── shift.py              # MODIFIED: drop ClockInRequest/ClockOutRequest
├── services/
│   ├── time_tracking_service.py  # MODIFIED: drop manual clock fns; add create_extra_hours; stats include extra
│   └── shift_service.py          # MODIFIED: drop legacy clock_in/clock_out
├── routers/
│   ├── time_tracking.py      # MODIFIED: drop clock-in/out/today/records; add POST/DELETE extra-hours
│   └── shifts.py             # MODIFIED: drop legacy clock-in/out endpoints
└── alembic/versions/<new>.py # NEW migration

frontend/src/
├── components/time-tracking/
│   ├── TimeClock.tsx         # DELETED
│   └── ExtraHoursModal.tsx   # NEW (admin/moderador)
├── hooks/useTimeTracking.ts  # DELETED
├── views/
│   ├── EmployeeDashboardView.tsx # MODIFIED: remove TimeClock; add extra-hours stat
│   └── AdminStatistics.tsx       # MODIFIED: add "Cargar horas extra" action
├── services/timeTrackingService.ts # MODIFIED: drop clock fns; add createExtraHours
└── types/                          # MODIFIED: drop clock types; add extra-hours types
```

## Verification

Backend: `alembic upgrade head`, `mypy app --strict`, `ruff check .`, `pytest`.
Frontend: `npm run lint`, `npm run build`.
Manual: empleado sin fichaje + ve horas mensuales; admin carga horas extra y se reflejan separadas.
