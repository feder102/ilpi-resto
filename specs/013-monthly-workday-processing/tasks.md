# Tasks: Procesamiento mensual de días trabajados

**Input**: Design documents from `specs/013-monthly-workday-processing/`
**Prerequisites**: `plan.md`, `spec.md`, `data-model.md`, `contracts/process-month.yaml`
**Tests**: Incluidos (constitution Quality Gate)

**Format**: `[ID] [P?] [Story] Description`
- `[P]`: Puede correr en paralelo (independiente)
- `[Story]`: US1, US2, US3

---

## Phase 1: Backend foundation

- [ ] T001 [US1] Agregar `MonthlyProcessRequest` y `MonthlyProcessResponse` en `backend/app/schemas/time_tracking.py`.
- [ ] T002 [US2] Refactor: cambiar firma de `TimeTrackingService.generate_time_entries_for_date` para devolver `tuple[int, int]` (`created, skipped`). Adaptar único caller `run_daily_batch_job` para consumir solo el primer elemento.
- [ ] T003 [US1][US2][US3] Implementar `TimeTrackingService.process_workdays_for_month(db, tenant_id, year, month)` que itera fecha por fecha, captura `NoShiftsFoundError`/`BatchProcessingError` y agrega los conteos.

**Checkpoint Phase 1**: el servicio mensual funciona unit-test-driven.

---

## Phase 2: API endpoint

- [ ] T004 [US1] Agregar `POST /admin/time-tracking/process-month` en `backend/app/routers/time_tracking.py` con guard `require_admin_or_moderator` y `@handle_exceptions`.

**Checkpoint Phase 2**: endpoint responde 200/403/422 correctamente.

---

## Phase 3: Tests backend

- [ ] T005 [P] [US1] Test unit: mes pasado con turnos → todos creados.
- [ ] T006 [P] [US2] Test unit: reprocesar mes ya procesado → `entries_created=0`, `entries_skipped=N`.
- [ ] T007 [P] [US3] Test unit: mes sin turnos → `days_without_shifts` correcto, sin error.
- [ ] T008 [P] [US1] Test unit: mes futuro → `days_processed=0`.
- [ ] T009 [P] [US1] Test integration: endpoint con Admin → 200; con Moderador → 200; con Empleado → 403.
- [ ] T010 [P] [US1] Test integration: validación de year/month fuera de rango → 422.

**Checkpoint Phase 3**: suite completa pasa.

---

## Phase 4: Frontend

- [ ] T011 [US1] Agregar `MonthlyProcessResult` en `frontend/src/types/timeTracking.ts`.
- [ ] T012 [US1] Agregar `processMonthlyWorkdays(year, month)` en `frontend/src/services/statisticsService.ts`.
- [ ] T013 [US1][US2] Agregar sección "Procesar mes completo" dentro del tab `batch` de `frontend/src/views/AdminStatistics.tsx` con selector año + mes, botón con estado loading y Alert de resultado/error.

**Checkpoint Phase 4**: UI navegable y funcional contra backend local.

---

## Phase 5: Polish & verification

- [ ] T014 Correr `ruff check`, `mypy --strict`, `pytest` (backend); `npm run lint`, `npm run build` (frontend).
- [ ] T015 Commit por fase con conventional commits (`feat:`, `test:`, `docs:`) y push.

**Checkpoint Phase 5**: branch lista para PR.

---

## Dependencias

```
T001 → T003
T002 → T003
T003 → T004
T004 → T005..T010 (tests)
(Backend) → T011..T013 (Frontend)
T005..T013 → T014 → T015
```

## Tareas paralelizables

T005..T010 (unit + integration tests) pueden escribirse en paralelo una vez T004 está hecho.
T011..T012 pueden hacerse en paralelo.
