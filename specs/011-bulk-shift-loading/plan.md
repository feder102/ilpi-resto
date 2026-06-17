# Implementation Plan: Carga masiva de turnos

**Branch**: `011-bulk-shift-loading` | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-bulk-shift-loading/spec.md`

---

## Summary

Agregar carga masiva de turnos sobre la infraestructura existente de roster (Feature
004). Desde la vista de calendario de turnos, Admin/Moderador selecciona varios
empleados, un tipo de turno y un rango de fechas, e indica si cargar todos los días
o solo días laborales (Lun-Vie). El backend expande el rango, reutiliza las
validaciones de conflicto de `create_shift`, omite y reporta los días en conflicto,
y crea el resto en una sola transacción.

**Key Technical Decisions**:
1. **Reutilización de `ShiftRecord`**: sin nueva tabla ni migración Alembic.
2. **Servicio nuevo `create_shifts_bulk`**: misma capa y patrón que `create_shift`.
3. **No atómico por conflicto**: días en conflicto se omiten (no abortan la
   operación); el resto se confirma en un único `session.commit()`.
4. **Preferencia fines de semana en el request** (`include_weekends`), no en el
   tenant.
5. **UI**: nuevo `BulkShiftLoadDialog` reutilizando `Modal`/`Button` y patrones de
   `ShiftAssignmentDialog`; botón visible solo para Admin/Moderador.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), React 19 + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Pydantic v2 (backend); Axios, DaisyUI v5 (frontend)
**Storage**: PostgreSQL 16 (sin cambios de esquema)
**Testing**: pytest + httpx (backend), Vitest/build (frontend)
**Target Platform**: Web browser (desktop/tablet)
**Project Type**: Full-stack web application (SPA + REST API)
**Performance Goals**: <500ms para un rango de 1 mes y varios empleados
**Constraints**: UI en español; timezone Europe/Madrid; RBAC en capa de servicio
**Scale/Scope**: rangos de hasta ~31 días * decenas de empleados por operación

---

## Constitution Check ✅

**GATE: Todos los principios PASS. No se requiere desviación.**

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Architecture | ✅ PASS | Router HTTP-only → `shift_service.create_shifts_bulk` → modelos |
| II. Strict Modularity | ✅ PASS | Lógica en `shift_service`; DTOs en `schemas/shift.py`; sin deps circulares |
| III. Strict Type Safety | ✅ PASS | DTOs Pydantic v2 (`BulkShiftCreate/Result`); TS strict en frontend |
| IV. Production-Ready | ✅ PASS | Sin secrets; logging estructurado `SHIFT_BULK_CREATE`; sin migración necesaria |
| V. Security-First | ✅ PASS | `require_role("Admin","Moderador")`; tenant isolation; auditoría |

**Conclusion**: Diseño listo. Sin violaciones.

---

## Project Structure

### Documentation (this feature)

```text
specs/011-bulk-shift-loading/
├── spec.md
├── plan.md
├── data-model.md
├── tasks.md
├── contracts/
│   └── bulk-shifts-api.md
└── checklists/
    └── requirements.md
```

### Source code (afectado)

```text
backend/app/
├── schemas/shift.py          # + BulkShiftCreate, BulkShiftSkipped, BulkShiftResult
├── services/shift_service.py # + create_shifts_bulk, _vacation_overlap
└── routers/shifts.py         # + POST /rosters/shifts/bulk

backend/tests/
├── unit/test_shift_service.py        # + TestCreateShiftsBulk
└── integration/test_shift_endpoints.py # + TestBulkRosterShifts

frontend/src/
├── types/shift.ts                       # + Bulk* types
├── services/shiftService.ts             # + bulkCreateRosterShifts
├── components/BulkShiftLoadDialog.tsx    # nuevo diálogo
└── views/ShiftRosterCalendar.tsx        # + botón y wiring
```

---

## Implementation Strategy

1. **Backend (servicio primero)**: DTOs en `schemas/shift.py`; `create_shifts_bulk`
   en `shift_service.py` (validación de rango/tipo, expansión de días, filtro de fin
   de semana, reutilización de conflictos, commit único, logging).
2. **Backend (router)**: endpoint `POST /rosters/shifts/bulk` con RBAC.
3. **Backend (tests)**: unitarios del servicio + contract/integration del endpoint.
4. **Frontend (servicio/tipos)**: tipos `Bulk*` y `bulkCreateRosterShifts`.
5. **Frontend (UI)**: `BulkShiftLoadDialog` + botón "Carga masiva" en la vista.
6. **Verificación**: pytest, ruff; npm lint/build; prueba manual end-to-end.

## Complexity Tracking

Sin desviaciones del constitution. No se añaden tablas, migraciones ni dependencias.
