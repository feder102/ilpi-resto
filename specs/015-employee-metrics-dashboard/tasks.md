---
description: "Task list for Métricas de Personal en Informes (015)"
---

# Tasks: Métricas de Personal en Informes

**Input**: Design documents from `/specs/015-employee-metrics-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/metrics-api.md, quickstart.md

**Tests**: Incluidos — el plan solicita `tests/unit/test_metrics_service.py` y `tests/integration/test_metrics_router.py` (gate de calidad + SC-002/SC-005).

**Organization**: Tareas agrupadas por User Story. Nota: varias tareas comparten archivos (`metrics.py`, `metrics_service.py`, `ReportsView.tsx`), por lo que NO se marcan `[P]` entre sí aunque pertenezcan a distintas stories; las stories siguen siendo entregables/testeables de forma incremental en orden de prioridad.

## Format: `[ID] [P?] [Story] Description`

## Path Conventions

Web app: `backend/app/...`, `backend/tests/...`, `frontend/src/...`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar la estructura mínima; no hay dependencias ni migraciones.

- [ ] T001 Verificar que existen los directorios `backend/tests/unit/` y `backend/tests/integration/` (crearlos con `__init__.py` si falta) para alojar los nuevos tests.
- [ ] T002 Confirmar que `TimeEntrySource` (`backend/app/models/time_entry.py`), `AbsenceService.count_absences_for_period` (`backend/app/services/absence_service.py`) y `vacation_service._get_or_create_balance` (`backend/app/services/vacation_service.py`) están disponibles para import (no requieren cambios).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esqueleto del módulo `metrics` (schema file, service file, router registrado). BLOQUEA todas las user stories.

**⚠️ CRITICAL**: Ninguna user story puede completarse hasta terminar esta fase.

- [ ] T003 Crear `backend/app/schemas/metrics.py` con los imports base (Pydantic v2 `BaseModel`, `date`, `Decimal`/`float`, `uuid`) y un docstring de módulo. Las clases concretas se añaden en cada story.
- [ ] T004 Crear `backend/app/services/metrics_service.py` con imports base (`Session`, `func`, `select` de sqlmodel; modelos `TimeEntry`/`TimeEntrySource`, `Absence`, `ShiftRecord`, `Employee`), una constante `ABSENTEEISM_ALERT_THRESHOLD = 5.0`, `DEFAULT_RANKING_LIMIT = 10`, y un helper privado `_require_admin(current_user: dict) -> None` que lanza `ForbiddenError` si `current_user.get("role") != "Admin"`.
- [ ] T005 Crear `backend/app/routers/metrics.py` con `router = APIRouter(tags=["metrics"])`, el alias `AdminOnly = Depends(require_role("Admin"))` y el decorador `@handle_exceptions` según el patrón de `time_tracking.py`. Sin endpoints todavía.
- [ ] T006 Registrar el router en `backend/app/main.py` `_include_routers()`: import `from app.routers import ... metrics` y `app.include_router(metrics.router, prefix=prefix)` (prefijo `/api/v1`).
- [ ] T007 [P] Añadir el bloque de tipos base en `frontend/src/types/api.ts` (interfaces vacías/compartidas de rango `date_from`/`date_to`) para las 4 respuestas; se completan en cada story.

**Checkpoint**: Módulo `metrics` cableado y accesible (los endpoints devolverán 404 hasta que cada story los añada).

---

## Phase 3: User Story 1 - Costo de horas extras y sobrecarga (Priority: P1) 🎯 MVP

**Goal**: El Admin ve el ratio de horas extras vs. ordinarias y el ranking de empleados con más horas extra del periodo.

**Independent Test**: Con horas ordinarias y extra sembradas en un mes, `GET /reports/overtime-ratio` y `GET /reports/overtime-ranking` devuelven valores correctos y la sección aparece en `/reports` solo para Admin.

### Tests for User Story 1 ⚠️

- [ ] T008 [P] [US1] En `backend/tests/unit/test_metrics_service.py`, tests de `get_overtime_ratio` (ratio correcto; `ratio_pct=None` sin ordinarias) y `get_overtime_ranking` (orden desc, límite, empleados sin extras excluidos).
- [ ] T009 [P] [US1] En `backend/tests/integration/test_metrics_router.py`, tests de `GET /reports/overtime-ratio` y `/overtime-ranking`: shape de respuesta, filtro de fechas, y **403 para rol Moderador/Empleado**.

### Implementation for User Story 1

- [ ] T010 [US1] En `backend/app/schemas/metrics.py`, añadir `OvertimeRatioResponse` (`date_from`, `date_to`, `ordinary_hours`, `extra_hours`, `ratio_pct: float | None`), `OvertimeRankingItem` (`employee_id`, `employee_name`, `extra_hours`) y `OvertimeRankingResponse` (`date_from`, `date_to`, `items`).
- [ ] T011 [US1] En `backend/app/services/metrics_service.py`, implementar `get_overtime_ratio(session, tenant_id, current_user, date_from, date_to)` (default últimos 30 días; suma por `source` con `func.coalesce`; guard división por cero → `None`) llamando primero a `_require_admin`.
- [ ] T012 [US1] En `backend/app/services/metrics_service.py`, implementar `get_overtime_ranking(session, tenant_id, current_user, date_from, date_to, limit)` (group by `employee_id` sobre `source=EXTRA`, order desc, limit; join `Employee` para nombre), con `_require_admin`.
- [ ] T013 [US1] En `backend/app/routers/metrics.py`, añadir `GET /reports/overtime-ratio` y `GET /reports/overtime-ranking` (query params `date_from`/`date_to`, `limit` con validación 1–50) que delegan al service pasando `current_user`.
- [ ] T014 [US1] En `frontend/src/types/api.ts`, añadir `OvertimeRatio`, `OvertimeRankingItem`, `OvertimeRanking` (valores numéricos como `number | string`).
- [ ] T015 [US1] En `frontend/src/services/dashboardService.ts`, añadir `getOvertimeRatio(filters)` y `getOvertimeRanking(filters)` (GET a `/reports/overtime-ratio` y `/reports/overtime-ranking`).
- [ ] T016 [US1] En `frontend/src/views/ReportsView.tsx`, crear la sección "Métricas de Personal" condicionada a `hasRole('Admin')` (de `useAuth`) con: KPI-card de **Ratio Extras %** y un **BarChart** (Recharts, Tooltip theme-aware `hsl(var(--bc))`) del **ranking de horas extra**, cargando ambos con el filtro de fechas existente y estados `Spinner`/`Alert`/`EmptyChart`.

**Checkpoint**: US1 funcional e independiente — MVP entregable.

---

## Phase 4: User Story 2 - Absentismo y alerta de clima (Priority: P2)

**Goal**: El Admin ve la tasa de absentismo del periodo con desglose justificada/injustificada y alerta visual si supera 5%.

**Independent Test**: Con turnos planificados y ausencias sembradas, `GET /reports/absenteeism` devuelve la tasa correcta, el desglose y `alert=true` sobre 5%; el KPI aparece en `/reports` solo para Admin.

### Tests for User Story 2 ⚠️

- [ ] T017 [P] [US2] En `backend/tests/unit/test_metrics_service.py`, tests de `get_absenteeism` (tasa correcta; `rate_pct=0` sin turnos; `alert` en el umbral 5%; `justified + unjustified == total`).
- [ ] T018 [P] [US2] En `backend/tests/integration/test_metrics_router.py`, test de `GET /reports/absenteeism`: shape, filtro de fechas y **403 no-Admin**.

### Implementation for User Story 2

- [ ] T019 [US2] En `backend/app/schemas/metrics.py`, añadir `AbsenteeismResponse` (`date_from`, `date_to`, `total_absences`, `justified_absences`, `unjustified_absences`, `planned_shifts`, `rate_pct`, `alert`).
- [ ] T020 [US2] En `backend/app/services/metrics_service.py`, implementar `get_absenteeism(session, tenant_id, current_user, date_from, date_to)`: `count(Absence)` total y justificadas por rango; `count(ShiftRecord)` por rango; `rate_pct` con guard div/0; `alert = rate_pct > ABSENTEEISM_ALERT_THRESHOLD`; `_require_admin`.
- [ ] T021 [US2] En `backend/app/routers/metrics.py`, añadir `GET /reports/absenteeism` (query `date_from`/`date_to`).
- [ ] T022 [US2] En `frontend/src/types/api.ts`, añadir `Absenteeism`; en `frontend/src/services/dashboardService.ts`, añadir `getAbsenteeism(filters)`.
- [ ] T023 [US2] En `frontend/src/views/ReportsView.tsx`, añadir el KPI-card de **Tasa Absentismo %** (color `warning`/`error` cuando `alert`), con el desglose justificada/injustificada como texto secundario, integrado al mismo filtro y carga.

**Checkpoint**: US1 y US2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Pasivo de vacaciones devengado (Priority: P3)

**Goal**: El Admin ve la deuda de vacaciones devengada por empleado activo y el total del plantel.

**Independent Test**: Con empleados de distinta antigüedad y días usados, `GET /reports/vacation-liability` devuelve el devengado proporcional por empleado y los totales; la tabla aparece en `/reports` solo para Admin.

### Tests for User Story 3 ⚠️

- [ ] T024 [P] [US3] En `backend/tests/unit/test_metrics_service.py`, tests de `get_vacation_liability` (prorrateo con `hire_date` previo al año y a mitad de año; `liability` negativo por adelanto; totales = suma de items; lista vacía sin empleados activos).
- [ ] T025 [P] [US3] En `backend/tests/integration/test_metrics_router.py`, test de `GET /reports/vacation-liability`: shape, param `year` y **403 no-Admin**.

### Implementation for User Story 3

- [ ] T026 [US3] En `backend/app/schemas/metrics.py`, añadir `VacationLiabilityItem` (`employee_id`, `employee_name`, `annual_days`, `months_worked`, `accrued_days`, `used_days`, `liability_days`) y `VacationLiabilityResponse` (`year`, `items`, `total_accrued`, `total_used`, `total_liability`).
- [ ] T027 [US3] En `backend/app/services/metrics_service.py`, implementar `get_vacation_liability(session, tenant_id, current_user, year)` (default año actual): iterar empleados activos; `anual` vía `_get_or_create_balance`; `months_worked` desde `hire_date`; `accrued = round(anual × months_worked / 12)`; `liability = accrued − used_days`; agregar totales; `_require_admin`.
- [ ] T028 [US3] En `backend/app/routers/metrics.py`, añadir `GET /reports/vacation-liability` (query `year: int | None`).
- [ ] T029 [US3] En `frontend/src/types/api.ts`, añadir `VacationLiabilityItem`, `VacationLiability`; en `frontend/src/services/dashboardService.ts`, añadir `getVacationLiability(year?)`.
- [ ] T030 [US3] En `frontend/src/views/ReportsView.tsx`, añadir el KPI-card de **Pasivo Total (días)** y la **tabla** (`ui/Table`) del pasivo por empleado (nombre, anual, devengado, usados, pasivo).

**Checkpoint**: Las tres user stories funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T031 Correr gates backend: `mypy app --strict`, `ruff check .`, `pytest tests/unit/test_metrics_service.py tests/integration/test_metrics_router.py` (todo en verde).
- [ ] T032 [P] Correr gates frontend: `npm run lint` y `npm run build` (sin errores de tipos).
- [ ] T033 Ejecutar el recorrido de `quickstart.md` (Admin ve las 4 métricas y reaccionan al filtro; Moderador NO ve la sección; alerta a >5%).
- [ ] T034 [P] Ejecutar `/update-docs` para actualizar `docs/architecture/` (backend README + **matriz RBAC** con los 4 endpoints `/reports/*` Admin-only; frontend README con la sección nueva de ReportsView) y `docs/architecture/site/data.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; BLOQUEA todas las stories (crea schema/service/router y los registra).
- **User Stories (Phase 3-5)**: dependen de Foundational. En orden de prioridad P1 → P2 → P3 (comparten `metrics_service.py`, `metrics.py`, `ReportsView.tsx`, por lo que se ejecutan secuencialmente).
- **Polish (Phase 6)**: depende de las stories deseadas completas.

### Within Each User Story

- Tests primero (deben fallar antes de implementar).
- Schema → service → endpoint (backend) → tipos → service frontend → vista.

### Parallel Opportunities

- T007 (frontend types base) en paralelo con T003–T006 (backend foundational).
- Dentro de cada story, los dos tests marcados [P] pueden escribirse en paralelo (archivos distintos: unit vs. integration).
- T032 y T034 en paralelo con otras tareas de polish según convenga.

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **VALIDAR** ratio + ranking en `/reports` (Admin) → demo.

### Incremental Delivery

Foundational listo → US1 (MVP) → US2 (absentismo) → US3 (pasivo). Cada story añade valor sin romper las anteriores. Cerrar con Phase 6 (gates + docs).

---

## Notes

- `[P]` = archivos distintos, sin dependencias.
- RBAC en doble capa: `require_role("Admin")` en router + `_require_admin` en service (Constitución V).
- Endpoints read-only; casos borde devuelven valores neutros (nunca 5xx).
- Manejar `Decimal` serializado como string en el frontend con `parseFloat`.
- Commit tras cada tarea o grupo lógico.
