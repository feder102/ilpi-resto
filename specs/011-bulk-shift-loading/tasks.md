# Tasks: Carga masiva de turnos

**Feature**: `011-bulk-shift-loading` | **Branch**: `011-bulk-shift-loading`
**Status**: ✅ Implementado (T001-T013)
**Organization**: Tareas agrupadas por fase y por historia de usuario.

## Format: `[ID] [P?] [Story] Description`
- **[ID]**: Identificador (T001, ...)
- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: US1, US2, US3, SETUP, FOUNDATIONAL

---

## Phase 1: Setup

- [x] T001 [SETUP] Crear carpeta de spec `specs/011-bulk-shift-loading/` con
  `spec.md`, `plan.md`, `data-model.md`, `contracts/`, `checklists/`.

## Phase 2: Foundational (DTOs compartidos) ⚠️ Bloqueante

- [x] T002 [FOUNDATIONAL] Agregar DTOs `BulkShiftCreate`, `BulkShiftSkipped`,
  `BulkShiftResult` en `backend/app/schemas/shift.py`.

## Phase 3: User Story 1 - Carga masiva a varios empleados (P1) 🎯 MVP

- [x] T003 [US1] Implementar `create_shifts_bulk` en
  `backend/app/services/shift_service.py`: validar rango y tipo de turno, expandir
  días, filtrar fines de semana (`include_weekends`), crear `ShiftRecord` y commit
  único.
- [x] T004 [US1] Agregar endpoint `POST /rosters/shifts/bulk` con
  `require_role("Admin","Moderador")` en `backend/app/routers/shifts.py`.
- [x] T005 [P] [US1] Tipos `BulkShiftCreatePayload`, `BulkShiftSkipped`,
  `BulkShiftResult` en `frontend/src/types/shift.ts`.
- [x] T006 [P] [US1] `bulkCreateRosterShifts` en
  `frontend/src/services/shiftService.ts`.
- [x] T007 [US1] Componente `frontend/src/components/BulkShiftLoadDialog.tsx`
  (multi-select de empleados, tipo de turno, rango de fechas, selector de días).
- [x] T008 [US1] Botón "Carga masiva" + wiring (refresh) en
  `frontend/src/views/ShiftRosterCalendar.tsx`.

## Phase 4: User Story 2 - Omitir y reportar conflictos (P2)

- [x] T009 [US2] Helper `_vacation_overlap` (no-raising) y lógica de omisión
  (turno existente / vacaciones / fecha pasada / empleado inválido) en
  `create_shifts_bulk`.
- [x] T010 [US2] Mostrar resumen de resultado (creados + tabla de omitidos con
  motivo) en `BulkShiftLoadDialog.tsx`.

## Phase 5: User Story 3 - Restricción por rol (P3)

- [x] T011 [US3] Ocultar botón y diálogo para rol `Empleado` en
  `ShiftRosterCalendar.tsx`; RBAC en el endpoint (ya cubierto por T004).

## Phase 6: Tests & Polish

- [x] T012 [P] Tests unitarios `TestCreateShiftsBulk` en
  `backend/tests/unit/test_shift_service.py` (fines de semana incluidos/excluidos,
  conflicto por turno, conflicto por vacaciones, rango inválido, rango pasado).
- [x] T013 [P] Tests de integración `TestBulkRosterShifts` en
  `backend/tests/integration/test_shift_endpoints.py` (201 éxito, solo laborales,
  403 Empleado, 401 sin auth).

---

## Dependencies & Execution Order

- T002 bloquea T003-T008 (DTOs compartidos).
- T003 bloquea T004, T009.
- T005/T006 pueden ir en paralelo con el backend.
- T007 depende de T005/T006; T008 depende de T007.
- T012/T013 dependen del backend (T002-T004, T009).

## Audit / Logging

- `create_shifts_bulk` emite `SHIFT_BULK_CREATE` (event_type) con contexto de la
  operación (FR-011).

## Notas

- Sin migración Alembic (se reutiliza `ShiftRecord`).
- UI y mensajes en español.
