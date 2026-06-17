# API Contract: Carga masiva de turnos

## POST /api/v1/rosters/shifts/bulk

Asigna un tipo de turno a uno o más empleados sobre un rango de fechas.

### Autorización

- **Roles permitidos**: `Admin`, `Moderador` (`require_role`).
- **401** si no autenticado; **403** si el rol es `Empleado`.
- Aislamiento por `tenant_id` extraído del JWT.

### Request body (`BulkShiftCreate`)

```json
{
  "employee_ids": ["1f2e...", "9a8b..."],
  "shift_type_id": "3c4d...",
  "start_date": "2026-07-06",
  "end_date": "2026-07-12",
  "include_weekends": false
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `employee_ids` | `UUID[]` | sí (≥1) | Empleados a los que asignar el turno |
| `shift_type_id` | `UUID` | sí | Tipo de turno (debe estar activo) |
| `start_date` | `date` | sí | Primer día del rango (inclusive) |
| `end_date` | `date` | sí | Último día del rango (inclusive) |
| `include_weekends` | `bool` | no (default `true`) | `true` = todos los días; `false` = solo Lun-Vie |

### Response 201 (`BulkShiftResult`)

```json
{
  "created": [
    {
      "id": "aa11...",
      "employee_id": "1f2e...",
      "employee_name": "Ana López",
      "date": "2026-07-06",
      "shift_type_id": "3c4d...",
      "shift_type_name": "Mañana",
      "created_at": "2026-06-17T10:00:00+00:00",
      "updated_at": "2026-06-17T10:00:00+00:00"
    }
  ],
  "skipped": [
    {
      "employee_id": "1f2e...",
      "employee_name": "Ana López",
      "date": "2026-07-08",
      "reason": "Vacaciones aprobadas"
    }
  ],
  "created_count": 4,
  "skipped_count": 1
}
```

### Reglas de omisión (no abortan la operación)

| Motivo (`reason`) | Condición |
|-------------------|-----------|
| `Turno ya existente` | El empleado ya tiene un `ShiftRecord` ese día |
| `Vacaciones aprobadas` | Vacación en estado `Aprobado` solapa ese día |
| `Fecha en el pasado` | El día es anterior a hoy |
| `Empleado no encontrado o inactivo` | El `employee_id` no existe / no está activo en el tenant |

Los fines de semana, cuando `include_weekends = false`, simplemente no se procesan
(no aparecen en `skipped`).

### Errores (no se crea nada)

| Código | Condición |
|--------|-----------|
| **400 / 422** | `start_date > end_date` |
| **400 / 422** | Rango íntegramente en el pasado (`end_date < hoy`) |
| **400 / 422** | Tipo de turno inexistente o inactivo |
| **422** | `employee_ids` vacío (validación Pydantic) |
| **401** | No autenticado |
| **403** | Rol `Empleado` |

### Auditoría

La operación registra un evento de log estructurado `SHIFT_BULK_CREATE` con
`tenant_id`, `created_by`, `shift_type_id`, `employee_count`, `created_count`,
`skipped_count`, `start_date`, `end_date`, `include_weekends`.
