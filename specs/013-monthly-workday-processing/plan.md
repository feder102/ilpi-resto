# Implementation Plan: Procesamiento mensual de días trabajados

**Feature Branch**: `claude/monthly-workday-processing-sqepux`
**Spec**: `specs/013-monthly-workday-processing/spec.md`
**Status**: Approved

---

## Summary

Wrapper mensual sobre el generador diario de `TimeEntry` ya existente (`TimeTrackingService.generate_time_entries_for_date`). Expone un único endpoint `POST /admin/time-tracking/process-month` que itera todas las fechas del mes hasta hoy, agrega los conteos y devuelve un resumen. La idempotencia ya está garantizada por el `UniqueConstraint` de la tabla `time_entries`; este feature no introduce esquema nuevo.

UI: nueva sección dentro del tab "Procesamiento por Lotes" de `AdminStatistics.tsx` con selector año/mes y botón.

---

## Technical Context

- **Backend**: Python 3.12, FastAPI, SQLModel.
- **Frontend**: React 19, TypeScript estricto, Tailwind + DaisyUI v5.
- **Sin migraciones Alembic**: cero schema changes.
- **Reutilización clave**:
  - `TimeTrackingService.generate_time_entries_for_date` — genera entries de una fecha de forma idempotente; ya maneja absences, shift_types, hours calculation.
  - `NoShiftsFoundError` — se captura por día como `days_without_shifts`.
  - `BatchProcessingError` — se captura por día como `errors[]`.
  - `require_admin_or_moderator` — dependency ya definido en `routers/time_tracking.py:81`.
  - `Button` con `loading` prop, `Alert` con `variant`, `Card` — ya en `components/ui/`.

---

## Constitution Gate Check

| Principio | Cumplimiento |
|---|---|
| **I. Clean Architecture** | ✅ Router solo serializa; lógica en `TimeTrackingService.process_workdays_for_month`; no hay queries en routers. |
| **II. Strict Modularity** | ✅ Método nuevo en la clase existente que ya maneja el dominio time-tracking. Reutiliza el generador diario, sin duplicar. Sin ciclos. |
| **III. Strict Type Safety** | ✅ Pydantic v2 schemas (`MonthlyProcessRequest`, `MonthlyProcessResponse`). Type hints en el método. TypeScript strict en el frontend (`MonthlyProcessResult`). |
| **IV. Production-Ready** | ✅ Sin secrets ni hardcodes; logger estructurado; sin migración; el endpoint corre dentro del mismo servidor existente. |
| **V. Security-First** | ✅ RBAC enforced en service (`require_admin_or_moderator`); `tenant_id` aislado vía JWT; rate limiting global aplica. |

---

## Project Structure

```
backend/
  app/
    schemas/time_tracking.py        ← +MonthlyProcessRequest, +MonthlyProcessResponse
    services/time_tracking_service.py  ← +process_workdays_for_month
    routers/time_tracking.py        ← +POST /admin/time-tracking/process-month
  tests/
    unit/test_time_tracking_service.py     ← tests del wrapper mensual
    integration/test_time_tracking_endpoints.py  ← test del endpoint con RBAC

frontend/
  src/
    types/timeTracking.ts            ← +MonthlyProcessResult
    services/statisticsService.ts    ← +processMonthlyWorkdays
    views/AdminStatistics.tsx        ← +sección "Procesar mes completo" en tab batch

specs/013-monthly-workday-processing/
  spec.md, plan.md, data-model.md, tasks.md
  contracts/process-month.yaml
```

---

## Decisiones de diseño

1. **Ampliar la firma de `generate_time_entries_for_date`** para que devuelva `(created, skipped)` en lugar de solo `created`. El único caller actual (`run_daily_batch_job`) consume solo el primer elemento y se adapta en una línea. Esto evita una doble query de conteo en el wrapper mensual.
2. **Capturar excepciones por día**: el wrapper mensual NO propaga `NoShiftsFoundError` ni `BatchProcessingError`; las convierte en métricas/mensajes del resumen.
3. **Solo fechas pasadas o de hoy**: el corte en `min(last_of_month, date.today())` evita generar TimeEntry para turnos futuros (consistente con el batch nocturno que procesa "ayer").
4. **Sin auditoría en `audit_log`**: el procesamiento mensual es una operación operativa (no de configuración) y se cubre vía el logger estructurado, igual que el batch diario.

---

## Verificación end-to-end

```bash
# Backend
cd backend
ruff check .
mypy app --strict
pytest tests/unit/test_time_tracking_service.py tests/integration/test_time_tracking_endpoints.py -v

# Frontend
cd ../frontend
npm run lint
npm run build

# Manual (Docker)
docker-compose up -d
# Login Admin → Estadísticas → Procesamiento por Lotes → Procesar mes completo
# Pulsar dos veces el mismo mes: la segunda debe devolver entries_created=0
```
