# API Contracts: Configuración de Días de Vacaciones

**Branch**: `012-vacation-config` | **Date**: 2026-06-25  
**Base URL**: `/api` (prefijo global existente en `main.py`)

---

## Nuevos endpoints

### GET /settings/vacations

Obtiene la configuración de vacaciones del tenant (default global).

**Roles**: Admin, Moderador

**Request**: sin body

**Response 200**:
```json
{
  "default_vacation_days": 30
}
```

**Errores**:
- `401 Unauthorized` — token inválido o ausente
- `403 Forbidden` — rol Empleado

---

### PUT /settings/vacations

Actualiza el default global de días de vacaciones para el tenant. Registra AuditLog.

**Roles**: Admin, Moderador

**Request body**:
```json
{
  "default_vacation_days": 25
}
```

**Validación**:
- `default_vacation_days` requerido, entero, rango [1, 365]. Error 400 si fuera de rango.

**Response 200**:
```json
{
  "default_vacation_days": 25
}
```

**Errores**:
- `400 Bad Request`:
  ```json
  { "error": { "code": "VALIDATION_ERROR", "message": "El número de días debe estar entre 1 y 365" } }
  ```
- `401 Unauthorized`
- `403 Forbidden`

---

### GET /settings/audit-log

Lista entradas de auditoría del tenant (paginado). Solo Admin.

**Roles**: Admin

**Query params**:
| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `entity_type` | string | null | Filtro: `"tenant_vacation_config"`, `"employee_vacation_config"` |
| `entity_id` | string | null | Filtro por entidad concreta (UUID como string) |
| `page` | int ≥ 1 | 1 | Página |
| `size` | int [1,100] | 20 | Elementos por página |

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "entity_type": "tenant_vacation_config",
      "entity_id": "uuid-del-tenant",
      "action": "update_default_vacation_days",
      "old_value": "30",
      "new_value": "25",
      "changed_by": "uuid-del-usuario",
      "changed_by_email": "admin@ilpi.es",
      "created_at": "2026-06-25T10:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

**Errores**:
- `401 Unauthorized`
- `403 Forbidden` — rol Moderador o Empleado

---

## Endpoints modificados

### POST /vacations (Admin/Moderador crea solicitud para empleado)

Sin cambios en la firma de request/response. Se añaden nuevas validaciones en el servicio:

**Nueva validación** (todos los roles — admin/mod también):
- `end_date` MUST ser ≤ 31-dic del año de `start_date`.

**Nuevo error 400**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Las vacaciones deben disfrutarse dentro del año natural (antes del 31 de diciembre)"
  }
}
```

---

### POST /employee/vacation-requests (Empleado crea solicitud propia)

Sin cambios en la firma de request/response. Se añaden nuevas validaciones en el servicio:

**Nueva validación 1** (solo empleado):
- `start_date >= date.today() + 2 meses calendario`.

**Nuevo error 400**:
```json
{
  "error": {
    "code": "ADVANCE_NOTICE_REQUIRED",
    "message": "Las vacaciones deben solicitarse con al menos 2 meses de anticipación"
  }
}
```

**Nueva validación 2** (también aplicada aquí — todos los roles):
- `end_date` MUST ser ≤ 31-dic del año de `start_date`.

**Nuevo error 400**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Las vacaciones deben disfrutarse dentro del año natural (antes del 31 de diciembre)"
  }
}
```

---

### PATCH /employees/{id} (Admin/Moderador actualiza empleado)

Se añade campo opcional `custom_vacation_days` al body. Si se incluye en el payload y el valor cambia, se registra AuditLog.

**Request body** (parcial — solo los campos nuevos):
```json
{
  "custom_vacation_days": 35
}
```
o para eliminar el override:
```json
{
  "custom_vacation_days": null
}
```

**Validación**:
- Si `custom_vacation_days` no es null, MUST ser entero en [1, 365].

**Response 200**: `EmployeeResponse` extendido con el nuevo campo:
```json
{
  "id": "uuid",
  "first_name": "Ana",
  "last_name": "García",
  ...
  "custom_vacation_days": 35
}
```

**Nuevo error 400**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El número de días personalizados debe estar entre 1 y 365"
  }
}
```

---

## Schemas Pydantic nuevos / modificados

### VacationSettingsRead (nuevo)
```python
class VacationSettingsRead(BaseModel):
    default_vacation_days: int
```

### VacationSettingsUpdate (nuevo)
```python
class VacationSettingsUpdate(BaseModel):
    default_vacation_days: int = Field(..., ge=1, le=365)
```

### AuditLogRead (nuevo)
```python
class AuditLogRead(BaseModel):
    id: uuid.UUID
    entity_type: str
    entity_id: str
    action: str
    old_value: str | None
    new_value: str | None
    changed_by: uuid.UUID
    changed_by_email: str | None  # join con User
    created_at: datetime
```

### EmployeeUpdate (modificado)
```python
class EmployeeUpdate(BaseModel):
    ...  # campos existentes
    custom_vacation_days: int | None = None  # NUEVO: Field(default=None, ge=1, le=365) cuando no es None
```

### EmployeeResponse (modificado)
```python
class EmployeeResponse(BaseModel):
    ...  # campos existentes
    custom_vacation_days: int | None  # NUEVO
```

---

## Constantes de AuditLog usadas en este feature

```python
# entity_type
AUDIT_ENTITY_TENANT_VACATION = "tenant_vacation_config"
AUDIT_ENTITY_EMPLOYEE_VACATION = "employee_vacation_config"

# action
AUDIT_ACTION_UPDATE_DEFAULT = "update_default_vacation_days"
AUDIT_ACTION_UPDATE_EMPLOYEE = "update_employee_vacation_days"

# error codes nuevos
ADVANCE_NOTICE_REQUIRED = "ADVANCE_NOTICE_REQUIRED"
```
