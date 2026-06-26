# Data Model: Procesamiento mensual de días trabajados

**Status**: Sin cambios de esquema.

---

## Entidades reutilizadas

### TimeEntry (`backend/app/models/time_entry.py`)

Tabla central de "días trabajados". Este feature reutiliza la entidad y, en particular, el `UniqueConstraint` como mecanismo nativo de idempotencia:

```python
UniqueConstraint(tenant_id, employee_id, shift_date, shift_type_id)
```

Cualquier intento de insertar una `TimeEntry` con la misma tupla `(tenant, empleado, fecha, tipo_de_turno)` es detectado y omitido por la lógica del servicio antes del INSERT (chequeo en memoria con `existing_keys`), garantizando que el procesamiento mensual sea seguro de ejecutar múltiples veces.

### ShiftRecord (`backend/app/models/shift_record.py`)

Fuente de verdad de los turnos asignados. El procesamiento mensual itera fecha por fecha leyendo todos los `ShiftRecord` del tenant para esa fecha y convirtiéndolos en `TimeEntry`.

### Absence (`backend/app/models/absence.py`)

Empleados con `Absence` registrada para una fecha se excluyen automáticamente del procesamiento (lógica preexistente en `generate_time_entries_for_date`).

### ShiftType (`backend/app/models/shift_type.py`)

Define las `time_windows` (start/end) que determinan las horas trabajadas calculadas para cada `TimeEntry`.

---

## Nuevas entidades

**Ninguna.**

---

## Nuevos esquemas (DTOs Pydantic, NO tablas)

### `MonthlyProcessRequest`

```python
class MonthlyProcessRequest(BaseModel):
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
```

### `MonthlyProcessResponse`

```python
class MonthlyProcessResponse(BaseModel):
    year: int
    month: int
    days_processed: int       # nº de fechas iteradas (1..hoy del mes)
    entries_created: int      # TimeEntry nuevos insertados
    entries_skipped: int      # turnos que ya tenían TimeEntry y se omitieron
    days_without_shifts: int  # fechas sin ningún ShiftRecord
    errors: list[str]         # mensajes de días con fallo no-bloqueante
```

---

## Migración Alembic

**No requerida.** Verificable con `alembic heads` antes y después del merge: el head no cambia.
