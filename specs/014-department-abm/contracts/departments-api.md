# API Contract: Departments

**Feature**: `014-department-abm`
**Base path**: `/api/v1/departments`
**Authentication**: JWT Bearer (todos los endpoints requieren login)
**Authorization**: Ver columna "Roles" por endpoint

> Convenciones generales:
> - Todas las respuestas usan JSON UTF-8.
> - Errores siguen el schema estándar del proyecto (`{ "detail": "...", "code": "..." }`).
> - `Authorization: Bearer <jwt>` obligatorio.
> - El `tenant_id` se infiere del JWT; nunca se acepta como parámetro.
> - Timestamps en ISO 8601 UTC.

---

## 1. Listar departamentos

```
GET /api/v1/departments
```

**Roles**: Admin, Moderador, Empleado (lectura).

**Query parameters**:

| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `include_inactive` | bool | `false` | Si `true`, incluye departamentos con `is_active=false` (solo respetado para Admin; ignorado/false para otros roles). |
| `search` | string | — | Filtro por nombre (case-insensitive, substring). |

**Response 200**:

```json
{
  "items": [
    {
      "id": "8c5fb3c0-...-...",
      "name": "Cocina",
      "description": "Equipo de cocina principal",
      "color": "#ef4444",
      "icon": "ChefHat",
      "is_system": false,
      "is_active": true,
      "employee_count": 14,
      "team_count": 2,
      "created_at": "2026-06-26T10:00:00Z",
      "updated_at": "2026-06-26T10:00:00Z"
    },
    {
      "id": "11111111-...-...",
      "name": "Sin asignar",
      "description": null,
      "color": "#9ca3af",
      "icon": "CircleHelp",
      "is_system": true,
      "is_active": true,
      "employee_count": 0,
      "team_count": 0,
      "created_at": "2026-06-26T10:00:00Z",
      "updated_at": "2026-06-26T10:00:00Z"
    }
  ],
  "total": 5
}
```

> `employee_count` y `team_count` se incluyen siempre que el caller sea Admin; para otros roles los valores pueden venir como `null` para no filtrar señal organizacional.

---

## 2. Obtener un departamento

```
GET /api/v1/departments/{id}
```

**Roles**: Admin, Moderador, Empleado (lectura).

**Path**: `id: UUID`.

**Response 200**: mismo shape de un item del listado.

**Errors**:
- `404 NotFound` — id inexistente o de otro tenant.

---

## 3. Crear departamento

```
POST /api/v1/departments
```

**Roles**: Admin (only).

**Request body**:

```json
{
  "name": "Lavadero",
  "description": "Vajilla y lavado de utensilios",
  "color": "#06b6d4",
  "icon": "Sparkles"
}
```

| Campo | Tipo | Required | Validación |
|---|---|---|---|
| `name` | string | sí | 1..60 chars, único `(tenant_id, lower(name))` |
| `description` | string \| null | no | 0..255 chars |
| `color` | string | no | hex `#RRGGBB`; default `#6b7280` |
| `icon` | string | no | dentro de `DEPARTMENT_ICON_CATALOG`; default `Building2` |

**Response 201**: shape de departamento (idem GET).

**Errors**:
- `400 BadRequest` — validación de Pydantic falló.
- `403 Forbidden` — rol distinto a Admin.
- `409 Conflict` — nombre duplicado en el tenant. `code: "department.name_conflict"`.

---

## 4. Actualizar departamento

```
PUT /api/v1/departments/{id}
```

**Roles**: Admin (only).

**Path**: `id: UUID`.

**Request body** (todos los campos opcionales — partial update):

```json
{
  "name": "Cocina Caliente",
  "description": "Línea de cocción",
  "color": "#dc2626",
  "icon": "Flame",
  "is_active": true
}
```

| Campo | Notas |
|---|---|
| `name` | Mismas reglas de unicidad que en POST. |
| `description` | Aceptado `null` para limpiarlo. |
| `color` | Mismo regex. |
| `icon` | Mismo catálogo. |
| `is_active` | Alterna entre activo/inactivo. Para `is_system=true` no se acepta el cambio. |

**Response 200**: departamento actualizado.

**Errors**:
- `400 BadRequest` — validación.
- `403 Forbidden` — no Admin **o** intento de modificar un departamento con `is_system=true`. `code: "department.system_protected"`.
- `404 NotFound` — id inexistente o de otro tenant.
- `409 Conflict` — nombre duplicado.

---

## 5. Preview de borrado

```
GET /api/v1/departments/{id}/delete-preview
```

**Roles**: Admin (only).

**Path**: `id: UUID`.

**Response 200**:

```json
{
  "department": {
    "id": "8c5fb3c0-...-...",
    "name": "Lavadero",
    "is_system": false
  },
  "target_department": {
    "id": "11111111-...-...",
    "name": "Sin asignar"
  },
  "employees_to_reassign": 4,
  "teams_to_reassign": 1
}
```

**Errors**:
- `403 Forbidden` — no Admin **o** `is_system=true`. `code: "department.system_protected"`.
- `404 NotFound` — id inexistente o de otro tenant.

---

## 6. Eliminar departamento (soft-delete + reasignación)

```
DELETE /api/v1/departments/{id}
```

**Roles**: Admin (only).

**Path**: `id: UUID`.

**Comportamiento**:
1. Service rechaza si `is_system=true`.
2. Resuelve `target = ensure_system_department(tenant_id)`.
3. En una transacción:
   - `UPDATE employees SET department_id = target.id WHERE department_id = id`
   - `UPDATE teams SET department_id = target.id WHERE department_id = id`
   - `UPDATE departments SET is_active = FALSE, updated_at = NOW() WHERE id = id`
4. Emite audit log `department.deleted` con counts.

**Response 200**:

```json
{
  "id": "8c5fb3c0-...-...",
  "employees_reassigned": 4,
  "teams_reassigned": 1,
  "target_department": {
    "id": "11111111-...-...",
    "name": "Sin asignar"
  }
}
```

**Errors**:
- `403 Forbidden` — no Admin **o** `is_system=true`. `code: "department.system_protected"`.
- `404 NotFound` — id inexistente o de otro tenant.
- `500 InternalServerError` — la transacción se rompió; rollback automático garantiza que ni el departamento ni las asignaciones cambiaron.

---

## 7. Cambios colaterales en `employees` y `teams`

### `POST /api/v1/employees` y `PUT /api/v1/employees/{id}`

Request:

```diff
- "department": "Cocina"
+ "department_id": "8c5fb3c0-...-..."
```

`department_id` es **requerido** en POST; opcional (partial update) en PUT. Validaciones:

- Debe existir y pertenecer al tenant.
- Debe estar `is_active=true` (no se permiten asignaciones a departamentos inactivos al alta/edición).

Response:

```diff
- "department": "Cocina"
+ "department": {
+   "id": "8c5fb3c0-...-...",
+   "name": "Cocina",
+   "color": "#ef4444",
+   "icon": "ChefHat",
+   "is_system": false
+ }
```

Filtros:

```diff
- GET /api/v1/employees?department=Cocina
+ GET /api/v1/employees?department_id=8c5fb3c0-...-...
```

### `POST /api/v1/teams` y `PUT /api/v1/teams/{id}`

Mismas reglas que Employee: request acepta `department_id`, response devuelve objeto anidado, filtros usan `department_id`.

### Otros endpoints

- `GET /api/v1/employees/statistics/department` y dashboards: agrupan por `department_id` pero exponen `department: { id, name, color, icon }` en cada bucket para preservar la UX existente.
- `moderator/*`: el scope del moderador se resuelve por `department_id` derivado de su propio `Employee.department_id`. Sin cambios funcionales.

---

## Audit log emitido

| Endpoint exitoso | Evento | Payload (campos no estándar) |
|---|---|---|
| `POST /departments` | `department.created` | `department_id`, `name` |
| `PUT /departments/{id}` (cualquier campo no-`is_active`) | `department.updated` | `department_id`, `changed_fields` |
| `PUT /departments/{id}` (cambia `is_active`) | `department.activated` / `department.deactivated` | `department_id` |
| `DELETE /departments/{id}` | `department.deleted` | `department_id`, `employees_reassigned`, `teams_reassigned`, `target_department_id` |

Eventos de fallo (403 por system_protected, 409 por conflict) también se loguean en nivel `WARNING` para soporte.
