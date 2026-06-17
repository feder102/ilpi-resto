# Data Model: Carga masiva de turnos

## Resumen

Esta feature **no introduce nuevas entidades ni cambios de esquema**. Reutiliza
`ShiftRecord`, `ShiftType`, `Employee` y `VacationRequest`. La novedad es la lógica
de expansión de un rango de fechas a múltiples `ShiftRecord` y los DTOs de
request/response de la operación masiva.

## Entidades reutilizadas

### ShiftRecord (sin cambios)

Cada turno creado por la carga masiva es un `ShiftRecord` idéntico a los que crea la
asignación individual:

| Field | Type | Notes |
|-------|------|-------|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK tenant (del JWT) |
| `employee_id` | UUID | FK employee |
| `date` | DATE | Día del turno (uno por día del rango) |
| `shift_type_id` | UUID | FK shift_type (común a toda la operación) |
| `created_by` | UUID | Usuario que ejecuta la carga |
| `created_at` / `updated_at` | TIMESTAMP | |

**Constraint clave reutilizada**: unicidad lógica por `(tenant_id, employee_id,
date)` — verificada en servicio; un día con turno existente se omite.

### ShiftType, Employee, VacationRequest

- **ShiftType**: debe existir y estar activo (`is_active = true`); validado una sola
  vez por operación.
- **Employee**: cada empleado del request debe existir, pertenecer al tenant y estar
  activo; si no, se omite y se reporta.
- **VacationRequest**: se consulta por día para detectar solapamiento con vacaciones
  en estado `Aprobado`.

## DTOs (Pydantic v2) — `backend/app/schemas/shift.py`

### BulkShiftCreate (request)

| Field | Type | Constraints |
|-------|------|-------------|
| `employee_ids` | `list[UUID]` | `min_length=1` |
| `shift_type_id` | `UUID` | requerido |
| `start_date` | `date` | requerido |
| `end_date` | `date` | requerido, `>= start_date` (validado en servicio) |
| `include_weekends` | `bool` | default `True` |

### BulkShiftSkipped (item de resultado)

| Field | Type | Notes |
|-------|------|-------|
| `employee_id` | `UUID` | |
| `employee_name` | `str \| None` | |
| `date` | `date` | |
| `reason` | `str` | "Turno ya existente" \| "Vacaciones aprobadas" \| "Fecha en el pasado" \| "Empleado no encontrado o inactivo" |

### BulkShiftResult (response)

| Field | Type | Notes |
|-------|------|-------|
| `created` | `list[ShiftResponse]` | turnos creados |
| `skipped` | `list[BulkShiftSkipped]` | días omitidos con motivo |
| `created_count` | `int` | |
| `skipped_count` | `int` | |

## Lógica de expansión de rango (servicio)

```text
para cada employee_id en employee_ids:
    si empleado inválido/inactivo -> skip("Empleado no encontrado o inactivo"); continuar
    para cada día d en [start_date .. end_date]:
        si not include_weekends y d.weekday() >= 5 (sábado/domingo): saltar sin reportar
        si d < hoy: skip("Fecha en el pasado"); continuar
        si existe ShiftRecord(tenant, employee, d): skip("Turno ya existente"); continuar
        si vacación aprobada solapa d: skip("Vacaciones aprobadas"); continuar
        crear ShiftRecord(...) (session.flush para obtener id)
session.commit()  # una sola transacción para todos los insert válidos
```

Validaciones previas (lanzan error y no crean nada):
- `start_date > end_date` → ValidationError.
- `end_date < hoy` (rango íntegramente pasado) → ValidationError.
- Tipo de turno inexistente o inactivo → ValidationError.

## Índices

Se aprovechan los índices existentes de `ShiftRecord` en `(tenant_id, employee_id,
date)` para la verificación de duplicados y en `VacationRequest` para el chequeo de
vacaciones. No se requieren índices nuevos.

## Estrategia de migración

Ninguna. Sin cambios de esquema.
