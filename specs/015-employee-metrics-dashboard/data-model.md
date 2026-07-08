# Phase 1 – Data Model: Métricas de Personal en Informes

**Sin cambios de esquema.** La feature es puramente de lectura/agregación. No hay migraciones Alembic, ni nuevas tablas, ni columnas. Se listan las entidades fuente (solo lectura) y las fórmulas de derivación.

## Entidades fuente (solo lectura)

### `TimeEntry` — `backend/app/models/time_entry.py`
Tabla de hechos de horas. Campos usados:
- `tenant_id`, `employee_id`, `shift_date` (filtro de rango), `hours_worked` (`Decimal(5,2)`), `source` (`TimeEntrySource`: `SHIFT` | `EXTRA` | `MANUAL`).
- Ordinarias = `source == SHIFT`; extras = `source == EXTRA`. `MANUAL` es legacy y hoy no se genera.

### `Absence` — `backend/app/models/absence.py`
Numerador del absentismo. Campos: `tenant_id`, `employee_id`, `date` (filtro de rango), `justified: bool`.

### `ShiftRecord` — `backend/app/models/shift_record.py`
Denominador del absentismo (turnos planificados). Campos: `tenant_id`, `employee_id`, `date` (filtro de rango).

### `VacationBalance` — `backend/app/models/vacation_balance.py`
Base del pasivo. Campos: `tenant_id`, `employee_id`, `year`, `total_days`, `used_days`. Único por `(tenant_id, employee_id, year)`.

### `Employee` — `backend/app/models/employee.py`
Nombres para el ranking y `hire_date` para el prorrateo. Campos: `id`, `first_name`, `last_name`, `hire_date`, `is_active`, `custom_vacation_days`.

### `Tenant` — `backend/app/models/tenant.py`
`default_vacation_days` (fallback del anual). Se accede indirectamente vía `_get_or_create_balance`.

## Fórmulas de cálculo

Todos los cálculos filtran por `tenant_id`. `date_from`/`date_to` por defecto = últimos 30 días (consistente con `dashboard_service`).

### 1. Ratio de horas extras vs. ordinarias
```
ordinarias = Σ hours_worked  WHERE source = SHIFT  AND shift_date ∈ [from, to]
extras     = Σ hours_worked  WHERE source = EXTRA  AND shift_date ∈ [from, to]
ratio_pct  = (extras / ordinarias) × 100     si ordinarias > 0
           = null                            si ordinarias == 0
```
Salida: `ordinary_hours`, `extra_hours`, `ratio_pct` (nullable).

### 2. Tasa de absentismo
```
total_absences       = count(Absence)      WHERE date ∈ [from, to]
justified_absences   = count(Absence)      WHERE date ∈ [from, to] AND justified = true
unjustified_absences = total_absences − justified_absences
planned_shifts       = count(ShiftRecord)  WHERE date ∈ [from, to]
rate_pct             = (total_absences / planned_shifts) × 100   si planned_shifts > 0
                     = 0                                          si planned_shifts == 0
alert                = rate_pct > 5.0
```
Salida: `total_absences`, `justified_absences`, `unjustified_absences`, `planned_shifts`, `rate_pct`, `alert`.

### 3. Ranking de horas extras
```
SELECT employee_id, SUM(hours_worked) AS extra_hours
FROM time_entries
WHERE tenant_id = :t AND source = EXTRA AND shift_date ∈ [from, to]
GROUP BY employee_id
ORDER BY extra_hours DESC
LIMIT :limit            -- default 10
-- join Employee para first_name + last_name
```
Salida: lista de `{ employee_id, employee_name, extra_hours }` (empleados sin extras no aparecen).

### 4. Pasivo de vacaciones devengado (año en curso)
Para cada `Employee` con `is_active = true` del tenant:
```
anual   = _get_or_create_balance(employee_id, year, tenant_id, session).total_days
usados  = balance.used_days
meses_trabajados =
    hire_date.year <  year  → mes_actual                       (1..12)
    hire_date.year == year  → mes_actual − hire_date.month + 1  (mín. 1)
    hire_date.year >  year  → 0                                 (borde)
devengado = round(anual × meses_trabajados / 12)
pasivo    = devengado − usados        -- puede ser negativo (adelanto)
```
Agregado:
```
total_accrued    = Σ devengado
total_used       = Σ usados
total_liability  = Σ pasivo
```
Salida: `year`, `items[] { employee_id, employee_name, annual_days, months_worked, accrued_days, used_days, liability_days }`, `total_accrued`, `total_used`, `total_liability`.

## Casos borde

| Caso | Resultado |
|---|---|
| Sin horas ordinarias en el periodo | `ratio_pct = null` |
| Sin turnos planificados en el periodo | `rate_pct = 0`, `alert = false` |
| Sin horas extra en el periodo | `overtime-ranking` = lista vacía |
| Sin empleados activos | `vacation-liability.items` = `[]`, totales = 0 |
| Empleado con adelanto de vacaciones | `liability_days` negativo (se muestra tal cual) |
| Empleado contratado en el año en curso | `months_worked` prorrateado desde su mes de alta |
| Rol no-Admin accede al endpoint | `403 Forbidden` (check en router + service) |
