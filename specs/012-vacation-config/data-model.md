# Data Model: Configuración de Días de Vacaciones

**Branch**: `012-vacation-config` | **Date**: 2026-06-25

---

## Cambios a modelos existentes

### Tenant (extensión)

**Archivo**: `backend/app/models/tenant.py`

```
Tenant
├── id: UUID (PK)
├── name: str
├── slug: str (unique)
├── timezone: str (default "Europe/Madrid")
├── locale: str (default "es")
├── is_active: bool (default True)
├── [NUEVO] default_vacation_days: int (NOT NULL, DEFAULT 30) ← días naturales por defecto al año
├── created_at: datetime
└── updated_at: datetime
```

**Restricciones**:
- `default_vacation_days` MUST ser un entero entre 1 y 365 (validado en capa de servicio).
- Valor inicial de la columna en migración: `DEFAULT 30` (mantiene compatibilidad con balances preexistentes que usaban 30 hardcodeado).

---

### Employee (extensión)

**Archivo**: `backend/app/models/employee.py`

```
Employee
├── id: UUID (PK)
├── tenant_id: UUID (FK Tenant)
├── ... (campos existentes sin cambio)
├── [NUEVO] custom_vacation_days: int | None (NULLABLE) ← override por empleado; NULL = usar default global
├── created_at: datetime
└── updated_at: datetime
```

**Restricciones**:
- `custom_vacation_days` NULLABLE: `None` significa "usar `Tenant.default_vacation_days`".
- Cuando no es `None`, MUST ser entero entre 1 y 365 (validado en capa de servicio).

---

### VacationBalance (sin cambios estructurales)

**Archivo**: `backend/app/models/vacation_balance.py`

El campo `total_days` sigue siendo el snapshot por employee/year. Cambia la lógica de creación:

```
Lógica al crear un nuevo VacationBalance:
  total_days = employee.custom_vacation_days
                 IF NOT NULL
               ELSE tenant.default_vacation_days
```

Los balances ya existentes NO se recalculan al cambiar la configuración.

---

### VacationRequest (sin cambios estructurales)

Se añaden dos nuevas validaciones a su creación (en servicio):
1. Para rol Empleado: `start_date >= date.today() + relativedelta(months=2)`.
2. Para todos los roles: `end_date <= date(start_date.year, 12, 31)`.

---

## Nuevas entidades

### AuditLog (nueva tabla)

**Archivo**: `backend/app/models/audit_log.py`

```
AuditLog
├── id: UUID (PK, default uuid4)
├── tenant_id: UUID (FK tenant.id, INDEX)
├── entity_type: str (NOT NULL)  ← ej: "tenant_vacation_config", "employee_vacation_config"
├── entity_id: str (NOT NULL)    ← UUID o int serializado del objeto afectado
├── action: str (NOT NULL)       ← ej: "update_default_vacation_days", "update_employee_vacation_days"
├── old_value: str | None        ← valor anterior (serializado)
├── new_value: str | None        ← valor nuevo (serializado)
├── changed_by: UUID (FK user.id, NOT NULL)
└── created_at: datetime UTC (NOT NULL, default utcnow)
```

**Índices**:
- `idx_audit_log_tenant_id` sobre `(tenant_id)` — para filtrar por tenant.
- `idx_audit_log_entity` sobre `(tenant_id, entity_type, entity_id)` — para historial de una entidad concreta.
- `idx_audit_log_created_at` sobre `(tenant_id, created_at DESC)` — para listado cronológico.

**Valores de `entity_type` en este feature**:

| entity_type | entity_id | action |
|---|---|---|
| `"tenant_vacation_config"` | `str(tenant.id)` | `"update_default_vacation_days"` |
| `"employee_vacation_config"` | `str(employee.id)` | `"update_employee_vacation_days"` |

**Notas**:
- Tabla append-only (sin `updated_at`, sin soft-delete).
- `changed_by` referencia `User.id` (no `Employee.id`).
- `old_value` y `new_value` son strings; el consumidor interpreta según `action` (ej: `"30"`, `"null"`).
- Genérica: futuros features pueden usar la misma tabla con nuevos `entity_type`/`action`.

---

## Diagrama de relaciones (simplificado)

```
Tenant (1) ──────────────────────────────── (N) VacationBalance
   │                                               │
   │ default_vacation_days                         │ total_days (calculado al crear)
   │                                               │
Employee (1) ──── custom_vacation_days ────► (N) VacationBalance
   │
   └── (N) VacationRequest  [añade validación: 2m anticipación, año natural]

User (1) ────────────────────────────────── (N) AuditLog [changed_by]
Tenant (1) ──────────────────────────────── (N) AuditLog [tenant_id]
```

---

## Regla de resolución de días al crear VacationBalance

```
FUNCIÓN get_vacation_days_for_employee(employee, tenant):
  SI employee.custom_vacation_days NO ES NULL:
    RETORNAR employee.custom_vacation_days
  SINO:
    RETORNAR tenant.default_vacation_days
```

Esta función se usa únicamente dentro de `_get_or_create_balance` en `vacation_service.py`, al crear una fila nueva. Los balances existentes son inmutables a cambios de configuración.

---

## Migración Alembic

**Nombre**: `add_vacation_config_and_audit_log`  
**Tipo**: Single revision (atómica)

Operaciones `upgrade()`:
1. `op.add_column('tenant', sa.Column('default_vacation_days', sa.Integer(), nullable=False, server_default='30'))`
2. `op.add_column('employee', sa.Column('custom_vacation_days', sa.Integer(), nullable=True))`
3. `op.create_table('audit_log', ...)` con todos los campos e índices.

Operaciones `downgrade()`:
1. `op.drop_table('audit_log')`
2. `op.drop_column('employee', 'custom_vacation_days')`
3. `op.drop_column('tenant', 'default_vacation_days')`
