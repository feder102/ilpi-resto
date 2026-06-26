# Data Model: ABM de Departamentos

**Feature**: `014-department-abm`
**Date**: 2026-06-26

---

## Nueva entidad: `Department`

### Atributos

| Campo | Tipo | Nullable | Default | Notas |
|---|---|---|---|---|
| `id` | UUID | NO | `uuid4()` | Primary key |
| `tenant_id` | UUID | NO | — | FK → `tenants.id`, ON DELETE CASCADE |
| `name` | VARCHAR(60) | NO | — | Visible al usuario, único `(tenant_id, lower(name))` |
| `description` | VARCHAR(255) | YES | `NULL` | Texto libre opcional |
| `color` | VARCHAR(7) | NO | `"#6b7280"` | Hex `#RRGGBB`, validado regex |
| `icon` | VARCHAR(40) | NO | `"Building2"` | Nombre de icono Lucide del catálogo |
| `is_system` | BOOLEAN | NO | `FALSE` | `TRUE` solo para "Sin asignar" |
| `is_active` | BOOLEAN | NO | `TRUE` | Soft-delete; inactivos no se ofrecen en selectores |
| `created_at` | TIMESTAMP TZ | NO | `now()` | Auditoría |
| `updated_at` | TIMESTAMP TZ | NO | `now()` | Actualizado en cada mutación |

### Constraints

- `PRIMARY KEY (id)`
- `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`
- `UNIQUE INDEX (tenant_id, lower(name))` — índice funcional para unicidad case-insensitive
- `INDEX (tenant_id, is_active)` — soporta listados filtrados frecuentes
- `INDEX (tenant_id, is_system) WHERE is_system = TRUE` — soporta resolución rápida de "Sin asignar"
- `CHECK (color ~ '^#[0-9a-fA-F]{6}$')`

### Reglas de negocio

- **Sistema (`is_system=TRUE`)**: solo "Sin asignar". Inmutable (rename/delete bloqueados en el service). `is_active` siempre `TRUE`.
- **Soft-delete**: `delete_with_reassign` setea `is_active=FALSE` y NO ejecuta DELETE físico para preservar referencias históricas.
- **Reactivación**: setear `is_active=TRUE` mediante `PUT` por Admin (escenario AS2.3 del spec).

---

## Cambios en entidades existentes

### `Employee`

| Campo | Antes | Después |
|---|---|---|
| `department` | `VARCHAR NOT NULL` (string) | **ELIMINADO** |
| `department_id` | — | `UUID NOT NULL` FK → `departments.id` |

- `ON DELETE`: **RESTRICT** (el borrado del departamento pasa siempre por el service, no se permite borrado físico que cascadee).
- Índice: `INDEX (department_id)`.
- Relación SQLModel: `department: "Department" = Relationship(back_populates="employees")`.

### `Team`

Idénticos cambios que `Employee`. `department_id UUID NOT NULL` FK con `ON DELETE RESTRICT`.

Constraint pre-existente `UNIQUE (tenant_id, name, department)` se actualiza a `UNIQUE (tenant_id, name, department_id)`.

---

## Migración Alembic

### Orden de operaciones (single revision)

1. **Crear tabla `departments`** con todas las columnas, índices y CHECK.
2. **Seed por tenant** (DML idempotente dentro de la migración):
   ```sql
   INSERT INTO departments (id, tenant_id, name, color, icon, is_system, is_active)
   SELECT gen_random_uuid(), t.id, v.name, v.color, v.icon, v.is_system, TRUE
   FROM tenants t
   CROSS JOIN (VALUES
     ('Sin asignar',         '#9ca3af', 'CircleHelp', TRUE),
     ('Cocina',              '#ef4444', 'ChefHat',    FALSE),
     ('Atención al Público', '#3b82f6', 'Users',      FALSE),
     ('Barra',               '#f59e0b', 'Coffee',     FALSE),
     ('Dirección',           '#8b5cf6', 'Briefcase',  FALSE)
   ) AS v(name, color, icon, is_system);
   ```
3. **Agregar columnas FK nullables**:
   ```sql
   ALTER TABLE employees ADD COLUMN department_id UUID NULL;
   ALTER TABLE teams     ADD COLUMN department_id UUID NULL;
   ```
4. **Backfill por nombre**:
   ```sql
   UPDATE employees e
   SET department_id = d.id
   FROM departments d
   WHERE d.tenant_id = e.tenant_id
     AND lower(d.name) = lower(e.department);

   UPDATE teams t
   SET department_id = d.id
   FROM departments d
   WHERE d.tenant_id = t.tenant_id
     AND lower(d.name) = lower(t.department);

   -- Cualquier residuo (mismatch o NULL): destino "Sin asignar"
   UPDATE employees e
   SET department_id = d.id
   FROM departments d
   WHERE e.department_id IS NULL
     AND d.tenant_id = e.tenant_id
     AND d.is_system = TRUE;

   UPDATE teams t
   SET department_id = d.id
   FROM departments d
   WHERE t.department_id IS NULL
     AND d.tenant_id = t.tenant_id
     AND d.is_system = TRUE;
   ```
5. **Promover a NOT NULL, agregar FK y dropear columnas viejas**:
   ```sql
   ALTER TABLE employees ALTER COLUMN department_id SET NOT NULL;
   ALTER TABLE employees ADD CONSTRAINT fk_employees_department
     FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
   ALTER TABLE employees DROP COLUMN department;
   CREATE INDEX ix_employees_department_id ON employees(department_id);

   ALTER TABLE teams ALTER COLUMN department_id SET NOT NULL;
   ALTER TABLE teams ADD CONSTRAINT fk_teams_department
     FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
   ALTER TABLE teams DROP COLUMN department;
   CREATE INDEX ix_teams_department_id ON teams(department_id);

   -- Recrear constraint compuesto de teams si existía
   ALTER TABLE teams DROP CONSTRAINT IF EXISTS uq_team_tenant_name_dept;
   ALTER TABLE teams ADD CONSTRAINT uq_team_tenant_name_dept
     UNIQUE (tenant_id, name, department_id);
   ```

### Downgrade

1. Recrear columna string `department VARCHAR NULL` en `employees` y `teams`.
2. `UPDATE` para copiar `name` desde la tabla `departments` vía FK.
3. `ALTER ... SET NOT NULL`.
4. Drop FK, drop columna `department_id`, drop tabla `departments`.

> Nota: el downgrade pierde información (color, icono, departamentos creados manualmente). Documentado en el docstring de la migración.

---

## Diagrama relacional (post-feature)

```
tenants ──< departments
              │
              ├──< employees
              └──< teams
```

- Cardinalidad: `1 tenant : N departments`, `1 department : N employees`, `1 department : N teams`.
- "Sin asignar" siempre presente: `WHERE tenant_id = $T AND is_system = TRUE` retorna exactamente una fila.

---

## Transiciones de estado

```
       ┌─────────────┐  toggle is_active=FALSE  ┌────────────┐
       │  Activo     │ ───────────────────────▶ │  Inactivo  │
       │ (default)   │ ◀─────────────────────── │            │
       └─────────────┘  toggle is_active=TRUE   └────────────┘
              │
              │ delete_with_reassign()
              ▼
       ┌──────────────────────────┐
       │ Soft-deleted (is_active  │
       │ =FALSE, FKs reasignadas) │  ← efecto del DELETE en este MVP
       └──────────────────────────┘
```

Para `is_system=TRUE`: ambos toggles y el delete están bloqueados en el service.

---

## Volumetría esperada

| Métrica | Estimación |
|---|---|
| Departamentos por tenant | 5 a 30 (decenas) |
| Empleados por departamento | 0 a 500 |
| Equipos por departamento | 0 a 50 |
| Frecuencia de cambios en catálogo | Baja (semanal o menos) |
| Frecuencia de lectura del listado | Alta (cada apertura de form, dashboard) |

→ Justifica el cache `useDepartments` en frontend y `INDEX (tenant_id, is_active)` en DB.

---

## Integridad y consistencia

- **Multi-tenant**: todo query filtrado por `tenant_id` extraído del JWT. Service rechaza requests con `department_id` perteneciente a otro tenant (devuelve 404 para no filtrar información cross-tenant).
- **Atomicidad del delete**: `delete_with_reassign` envuelve los `UPDATE` de `employees`/`teams` + el toggle `is_active=FALSE` del departamento en una sola transacción SQLModel; el rollback automático en caso de excepción cubre FR-013.
- **Carrera contra el preview**: si entre el preview y el delete cambia el conteo (otro admin asigna empleados al departamento), el delete sigue siendo seguro: reasigna lo que haya. El UI muestra el conteo final en el toast post-delete.
