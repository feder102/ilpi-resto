# Implementation Plan: Métricas de Personal en Informes

**Branch**: `claude/employee-metrics-dashboard-abwh8k` (numeración interna: `015-employee-metrics-dashboard`) | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-employee-metrics-dashboard/spec.md`

## Summary

Ampliar la vista de Informes (`ReportsView` / `/reports`) con una sección **"Métricas de Personal"** exclusiva del rol **Admin**, que expone cuatro indicadores de gestión sobre datos ya persistidos (sin migraciones ni modelos nuevos):

1. **Ratio de horas extras vs. ordinarias** — `Σ hours_worked(source=EXTRA) / Σ hours_worked(source=SHIFT)` sobre el rango de fechas.
2. **Tasa de absentismo** — `count(Absence) / count(ShiftRecord)` sobre el rango, con desglose justificada/injustificada y alerta cuando supera 5%.
3. **Ranking de horas extras** — top 10 empleados por suma de horas extra en el rango.
4. **Pasivo de vacaciones devengado** — por empleado activo del año en curso, `devengado = round(anual × meses_trabajados / 12)`, `pasivo = devengado − used_days`, más el total agregado del plantel.

El backend añade tres archivos nuevos (`schemas/metrics.py`, `services/metrics_service.py`, `routers/metrics.py`) siguiendo el patrón `routers → services → models`, con RBAC AdminOnly enforced en el service layer y endpoints bajo el prefijo `/api/v1/reports`. El frontend extiende `ReportsView.tsx` con KPI-cards, un gráfico de barras (Recharts, ya instalado) y una tabla, todo condicionado a `hasRole('Admin')` y respetando el filtro de fechas existente. Toda la lógica reutiliza servicios existentes (`AbsenceService.count_absences_for_period`, `vacation_service._get_or_create_balance`) y el enum `TimeEntrySource`.

## Technical Context

**Language/Version**: Python 3.12 (backend) + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Pydantic v2 (backend) · React 19, react-router-dom v7, Recharts, Tailwind CSS v4 + DaisyUI v5, Axios, Lucide React (frontend)
**Storage**: PostgreSQL 16 — **solo lectura**; sin nuevas tablas ni migraciones. Fuentes: `time_entries`, `absences`, `shift_records`, `vacation_balances`, `employees`, `tenants`
**Testing**: pytest + httpx (backend) · Vitest + React Testing Library (frontend); mypy --strict + ruff + ESLint como gates
**Target Platform**: Linux container (Docker Compose en desarrollo, despliegue containerizado en producción)
**Project Type**: Web application (backend FastAPI + frontend SPA)
**Performance Goals**: Carga de las cuatro métricas del periodo en < 10 s percibidos por el Admin (SC-001); consultas agregadas < 500 ms p95 con volúmenes MVP (cientos de empleados, miles de registros de horas por periodo)
**Constraints**: Multi-tenant aware (todo query filtrado por `tenant_id`); RBAC AdminOnly enforced en service layer; endpoints read-only; mypy --strict zero errors; valores `Decimal` serializados como string manejados en frontend con `parseFloat`
**Scale/Scope**: 4 endpoints GET nuevos, 1 vista frontend extendida; decenas a cientos de empleados por tenant; un solo tenant en producción inicial pero modelo preparado para multi-tenant

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación |
|---|---|---|
| **I. Clean Architecture** | ✅ PASS | Dependencias `routers → services → models`. Router solo serialización + RBAC; `metrics_service` contiene todos los cálculos; no accede a HTTP ni conoce request. Modelos existentes sin cambios. |
| **II. Strict Modularity** | ✅ PASS | Módulo nuevo `metrics` con responsabilidad única (agregaciones de informes). Reuso de `AbsenceService`, `vacation_service`, `dependencies.py`, `common/exceptions.py`. DAG limpio, sin dependencias circulares. |
| **III. Strict Type Safety** | ✅ PASS | Esquemas Pydantic v2 tipados para cada respuesta; funciones de service con firmas completas; frontend TS strict con interfaces nuevas. Cero `Any` sin justificar. |
| **IV. Production-Ready** | ✅ PASS | Sin migraciones (read-only). Sin secretos hardcoded. Umbral de alerta (5%) y límite del ranking (10) como constantes nombradas. Docstrings en funciones públicas del service. |
| **V. Security-First** | ✅ PASS | RBAC `require_role("Admin")` en router **+** check explícito de rol en cada función del service (defensa en profundidad). Queries vía ORM (sin SQL crudo). Todo filtrado por `tenant_id` (least privilege + aislamiento). |
| **VI. Structured Error Handling** | ✅ PASS | Reuso de `@handle_exceptions` y excepciones de dominio (`ForbiddenError`). Casos borde (división por cero, sin datos) resueltos con valores neutros, no excepciones. Errores de validación de query params vía Pydantic/FastAPI. |

**Result**: PASS — no se requieren entradas en `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/015-employee-metrics-dashboard/
├── plan.md                     # Este archivo (output de /speckit.plan)
├── spec.md                     # Especificación funcional (output de /speckit.specify)
├── research.md                 # Phase 0: decisiones de diseño técnico
├── data-model.md               # Phase 1: entidades fuente y fórmulas de cálculo
├── quickstart.md               # Phase 1: cómo probar la feature end-to-end
├── contracts/
│   └── metrics-api.md          # Phase 1: contrato HTTP de los 4 endpoints nuevos
├── checklists/
│   └── requirements.md         # Validación de calidad del spec (/speckit.specify)
└── tasks.md                    # Phase 2: tareas dependency-ordered (/speckit.tasks — siguiente paso)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── schemas/
│   │   └── metrics.py                # NUEVO  OvertimeRatioResponse, AbsenteeismResponse,
│   │                                 #        OvertimeRankingItem, VacationLiabilityItem/Response
│   ├── services/
│   │   └── metrics_service.py        # NUEVO  4 funciones puras de cálculo + check RBAC
│   ├── routers/
│   │   └── metrics.py                # NUEVO  GET /reports/overtime-ratio, /absenteeism,
│   │                                 #        /overtime-ranking, /vacation-liability (Admin-only)
│   └── main.py                       # MOD    registrar metrics.router bajo prefijo /api/v1
└── tests/
    ├── unit/
    │   └── test_metrics_service.py   # NUEVO  unit tests de fórmulas y casos borde
    └── integration/
        └── test_metrics_router.py    # NUEVO  contract tests (RBAC 403 no-Admin, shapes, filtros)

frontend/
├── src/
│   ├── types/
│   │   └── api.ts                    # MOD    interfaces de las 4 respuestas de métricas
│   ├── services/
│   │   └── dashboardService.ts       # MOD    getOvertimeRatio, getAbsenteeism,
│   │                                 #        getOvertimeRanking, getVacationLiability
│   └── views/
│       └── ReportsView.tsx           # MOD    sección "Métricas de Personal" (solo Admin)
```

**Structure Decision**: Web application (backend FastAPI + frontend SPA en monorepo). El módulo `metrics` se inserta sin cambios estructurales, siguiendo el patrón de todas las features previas (router + service + schema). No se toca la capa de modelos ni la base de datos: la feature es puramente de agregación/lectura sobre entidades existentes. En el frontend se extiende la vista existente en lugar de crear una nueva, alineado con la decisión de producto "ampliar Informes".

## Phase 0 – Research

Ver [`research.md`](./research.md). Decisiones tomadas:

1. **Ubicación del backend**: módulo dedicado `metrics` (router + service + schema) en lugar de ampliar `dashboard.py`, por responsabilidad única y para aislar el RBAC AdminOnly (el `dashboard` actual es Admin/Moderador).
2. **4 endpoints separados vs. 1 combinado**: cuatro endpoints GET independientes bajo `/reports/*`, testeables por separado y cargados en paralelo desde el frontend; menor acoplamiento que un único payload monolítico.
3. **Ratio y ranking desde `TimeEntry.source`**: `SHIFT` = ordinarias, `EXTRA` = extras. Agregación con `func.sum`/`func.coalesce` filtrando por `tenant_id` y rango de `shift_date`.
4. **Absentismo**: numerador vía `AbsenceService.count_absences_for_period` (devuelve total/justificadas/injustificadas); denominador = `count(ShiftRecord)` en el rango. Guard de división por cero → 0%.
5. **Pasivo devengado proporcional**: `anual` resuelto reutilizando `vacation_service._get_or_create_balance` (respeta `custom_vacation_days` → `tenant.default_vacation_days` → 30). `meses_trabajados` derivado de `hire_date` vs. año/mes actual. `pasivo` puede ser negativo (adelanto), se muestra tal cual.
6. **RBAC doble**: `require_role("Admin")` en el router + `if current_user["role"] != "Admin": raise ForbiddenError` al inicio de cada función del service (exigido por Constitución V).
7. **Frontend theme-aware**: Recharts con Tooltip usando variables DaisyUI (`hsl(var(--bc))`) siguiendo `DepartmentStatisticsCard`, evitando colores hex hardcodeados. Manejo de `Decimal` serializado como string con `parseFloat`.

Sin entradas `NEEDS CLARIFICATION`.

## Phase 1 – Design

Ver:

- [`data-model.md`](./data-model.md) — entidades fuente (solo lectura), fórmulas de cálculo detalladas y casos borde.
- [`contracts/metrics-api.md`](./contracts/metrics-api.md) — contrato HTTP de los cuatro endpoints nuevos (params, shapes, códigos de error).
- [`quickstart.md`](./quickstart.md) — recorrido end-to-end para validar la feature manualmente.

### Constitution Re-check post-design

Tras detallar fórmulas y contrato, los seis principios siguen cumpliéndose:

- Todos los cálculos viven en `metrics_service`; el router solo mapea query params → service → schema. ✅ Clean Architecture + Modularity.
- Cada función del service verifica rol Admin antes de consultar datos y filtra por `tenant_id`. ✅ Security-First.
- Endpoints read-only e idempotentes; casos borde devuelven valores neutros sin romper la semántica REST. ✅ Structured Errors.

**Result**: PASS — sin violaciones, `Complexity Tracking` queda vacío.

## Complexity Tracking

> No se requiere — todas las gates de la constitución pasan sin desvíos.
