# Phase 0 – Research: Métricas de Personal en Informes

Todas las decisiones se apoyan en la infraestructura ya existente (Features 004, 008, 012, 014). No hay `NEEDS CLARIFICATION`.

## Decisión 1 — Módulo backend dedicado `metrics`

**Decision**: Crear `routers/metrics.py` + `services/metrics_service.py` + `schemas/metrics.py`, en lugar de ampliar `dashboard.py`/`dashboard_service.py`.

**Rationale**: El router `dashboard` actual es Admin/Moderador (`AdminOrMod`), mientras que estas métricas son **Admin-only**. Aislar el módulo evita mezclar niveles de autorización en el mismo archivo y respeta la responsabilidad única (Constitución II). Los endpoints comparten el prefijo semántico `/reports/*` con los existentes, pero viven en su propio router.

**Alternatives considered**: Ampliar `dashboard.py` — rechazado por mezclar RBAC AdminOnly con AdminOrMod y sobrecargar un módulo ya tocado por Feature 014.

## Decisión 2 — Cuatro endpoints GET independientes

**Decision**: `GET /reports/overtime-ratio`, `/reports/absenteeism`, `/reports/overtime-ranking`, `/reports/vacation-liability`.

**Rationale**: Cada métrica es testeable de forma aislada (una User Story puede implementarse/probarse sola), y el frontend puede cargarlas en paralelo con `Promise.all`. Menor acoplamiento que un único payload monolítico; alineado con el patrón `/reports/hours-by-day` + `/reports/department-distribution` ya existente.

**Alternatives considered**: Un único `GET /reports/personnel-metrics` combinado — rechazado por acoplar cuatro cálculos con distintos parámetros (los tres primeros usan rango de fechas; el pasivo usa `year`).

## Decisión 3 — Ratio y ranking desde `TimeEntry.source`

**Decision**: Horas ordinarias = `Σ hours_worked WHERE source=SHIFT`; horas extra = `Σ hours_worked WHERE source=EXTRA`, agregadas con `func.coalesce(func.sum(...), 0)` filtrando por `tenant_id` y `shift_date` en el rango. El ranking agrupa por `employee_id` sobre `source=EXTRA`, ordena descendente y limita a 10, uniendo `Employee` para nombre y apellido.

**Rationale**: `TimeEntry` es la tabla de hechos de horas (Feature 008). El enum `TimeEntrySource` (`backend/app/models/time_entry.py:23`) ya separa ordinarias (auto-generadas del roster) de extras (cargadas por Admin). El patrón de query replica `dashboard_service.get_hours_by_day`.

**Alternatives considered**: Comparar horas reales vs. esperadas del `ShiftType` — rechazado: no existe registro de exceso automático; las horas ordinarias ya SON las esperadas del turno, y el overtime siempre es carga manual `EXTRA`.

## Decisión 4 — Absentismo agregado consultando `Absence` directamente

**Decision**: Numerador = `count(Absence)` en el rango filtrando por `tenant_id`; total justificadas = `count WHERE justified=true`; injustificadas = total − justificadas. Denominador = `count(ShiftRecord)` en el rango. `tasa = total / planificados × 100` con guard de división por cero → 0.

**Rationale**: `AbsenceService.count_absences_for_period` (`absence_service.py:229`) es **por empleado** (recibe `employee_id`), no sirve para el agregado del plantel. Se replica su misma lógica (`total`, `justified`, `total − justified`) pero con una query agregada sin filtro de empleado. El denominador es `ShiftRecord` (turnos planificados), no `TimeEntry`, porque al registrar una ausencia el sistema **borra** el `TimeEntry(SHIFT)` de ese día (`absence_service.py`), de modo que los turnos planificados originales solo persisten en `ShiftRecord`.

**Alternatives considered**: Iterar `count_absences_for_period` por empleado — rechazado por N+1; una sola query agregada es más eficiente.

## Decisión 5 — Pasivo de vacaciones proporcional reutilizando el accrual canónico

**Decision**: Para cada empleado activo del año en curso:
- `anual` = `_get_or_create_balance(employee_id, year, tenant_id, session).total_days` (respeta `custom_vacation_days` → `tenant.default_vacation_days` → 30).
- `meses_trabajados`: si `hire_date.year < year` → `mes_actual` (1..12); si `hire_date.year == year` → `mes_actual − hire_date.month + 1`; si contratado en un año futuro (borde) → 0.
- `devengado = round(anual × meses_trabajados / 12)`.
- `usados` = `balance.used_days`; `pasivo = devengado − usados` (puede ser negativo = adelanto).
- Agregado: `pasivo_total = Σ pasivo`, `devengado_total`, `usados_total`.

**Rationale**: Reutilizar `vacation_service._get_or_create_balance` (`vacation_service.py:56`) garantiza que el "anual" respeta exactamente la misma jerarquía de defaults que el resto del sistema (Feature 012). El prorrateo por `hire_date` implementa el "devengamiento" pedido, que hoy no está persistido en ningún sitio.

**Alternatives considered**: Saldo simple `total − used` — descartado por el usuario (quiere devengamiento proporcional). Persistir el devengado mensual — innecesario: se calcula on-the-fly desde `hire_date`.

## Decisión 6 — RBAC en doble capa (Admin-only)

**Decision**: `require_role("Admin")` como dependency en cada endpoint del router **y** check explícito `if current_user.get("role") != "Admin": raise ForbiddenError(...)` al inicio de cada función del service.

**Rationale**: La Constitución (Principio V) exige que la autorización se enforce en el service layer, no solo en el router. Patrón ya usado en `absence_service.py:42` y `employee_service.py`. El service recibe `current_user: dict` (clave `role`, según `dependencies.py:63`).

**Alternatives considered**: Solo dependency en router — viola la Constitución.

## Decisión 7 — Frontend theme-aware y manejo de `Decimal`

**Decision**: Extender `ReportsView.tsx` con una sección renderizada solo si `hasRole('Admin')` (de `useAuth`). KPI-cards con el patrón de borde de color de `EmployeeStatisticsView`; `BarChart` de Recharts para el ranking con Tooltip usando variables DaisyUI (`hsl(var(--bc))`) como en `components/time-tracking/DepartmentStatisticsCard.tsx`; tabla `ui/Table` para el pasivo por empleado. Los valores `Decimal` que el backend serializa como string se normalizan con `typeof x === 'string' ? parseFloat(x) : x`.

**Rationale**: Reutiliza patrones ya probados en el proyecto; evita colores hex hardcodeados que rompen el tema oscuro; el patrón `number | string` + `parseFloat` ya se usa en `types/timeTracking.ts` y sus vistas.

**Alternatives considered**: Vista nueva dedicada — descartado por el usuario (quiere ampliar Informes). Colores hex fijos — rechazado por inconsistencia con el tema oscuro.
