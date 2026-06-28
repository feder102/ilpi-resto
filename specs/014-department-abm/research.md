# Research: ABM de Departamentos

**Feature**: `014-department-abm`
**Date**: 2026-06-26
**Status**: Phase 0 complete — todas las decisiones cerradas, sin `NEEDS CLARIFICATION` pendientes.

---

## Decisión 1: Modelo FK vs string-con-tabla

**Decisión**: Tabla `departments` + columna `department_id UUID NOT NULL` con FK en `employees` y `teams`. La columna string `department` se elimina.

**Rationale**:
- Constitución (Clean Architecture + Modularity) prefiere relaciones formales sobre strings con semántica implícita.
- Renombrar un departamento no requiere `UPDATE` masivo en `employees`/`teams`; basta con tocar el catálogo. Soporta SC-001 ("crear/renombrar en < 1 minuto").
- Integridad referencial vía base: imposible que un empleado quede con un departamento inexistente.
- Auditar/preview de borrado se resuelve con un `SELECT COUNT(*)` directo por `department_id`.

**Alternatives considered**:
- *Departamento como string con tabla auxiliar para gestión*: rechazado. Renombrar requeriría `UPDATE` en tablas grandes con riesgo de drift; complica la unicidad si el admin renombra y crea otro con el nombre viejo.
- *Departamento como enum*: rechazado. Es el estado actual y exactamente el problema que la feature resuelve.

---

## Decisión 2: Identidad del departamento "Sin asignar"

**Decisión**: Departamento per-tenant con `is_system=True` y `name="Sin asignar"` (creado por seed/migración). El sistema lo identifica por `is_system` + `tenant_id`, no por nombre.

**Rationale**:
- Resolverlo por flag evita acoplar la lógica a un literal y permite i18n futuro sin migración de datos.
- Único por tenant: garantiza un destino determinístico para la reasignación.
- Si por algún motivo no existe (DB corrupta, tenant nuevo), `ensure_system_department(tenant_id)` lo crea idempotentemente antes de cualquier borrado, evitando 500s.

**Alternatives considered**:
- *Match por nombre literal "Sin asignar"*: rechazado por frágil ante i18n y a renombres accidentales (aunque protegemos el rename).
- *Constante a nivel app (ID hardcoded)*: rechazado, no se lleva bien con multi-tenant.

---

## Decisión 3: Estrategia de borrado — hard vs soft delete

**Decisión**: **Soft-delete** (`is_active=False`) sobre el departamento + reasignación atómica de FKs a "Sin asignar".

**Rationale**:
- Preserva trazabilidad histórica (FR-019, SC-006): reportes y registros pasados que retengan el `department_id` siguen siendo legibles.
- Consistente con el patrón ya usado por `Employee.is_active`, `Team.is_active`, `ShiftType.is_active`.
- Permite "deshacer" un borrado accidental marcando `is_active=True` (no expuesto en MVP, pero el dato queda).
- El listado de admin filtra por `is_active` por defecto; un toggle muestra inactivos.

**Alternatives considered**:
- *Hard delete*: rechazado. Rompería históricos que referencien el `department_id` y violaría FR-019.
- *Cascade SET NULL*: rechazado. Dejar empleados con `department_id=NULL` rompe el contrato de Empleado (FR-19 implícito: todo empleado tiene departamento) y complica filtros.

---

## Decisión 4: Endpoint de preview previo al borrado

**Decisión**: Endpoint dedicado `GET /api/v1/departments/{id}/delete-preview` que devuelve `{ employees_to_reassign: int, teams_to_reassign: int, target_department: { id, name } }`. El frontend lo invoca antes de abrir el modal de confirmación.

**Rationale**:
- Cumple FR-010 / FR-011 (mostrar conteo exacto antes de confirmar).
- Mantiene `DELETE` idempotente y limpio: no retorna info adicional ni recibe parámetros de confirmación.
- Permite que el modal de confirmación renderice el texto antes de cualquier mutación; si el preview falla (depto ya eliminado por otro admin), el frontend muestra el error sin abrir confirmación.

**Alternatives considered**:
- *Hacer el `DELETE` en dos pasos con token*: complejidad innecesaria.
- *Incluir el conteo en el listado de departamentos*: viable como complemento pero no como única vía (el listado puede estar cacheado; el preview es la fuente de verdad al momento de confirmar).

---

## Decisión 5: Migración Alembic con backfill

**Decisión**: Una sola migración Alembic en cinco operaciones DDL/DML:

1. `CREATE TABLE departments` con columnas, índices y constraint único `(tenant_id, lower(name))`.
2. `INSERT` inicial por tenant: cuatro defaults (`Cocina`, `Atención al Público`, `Barra`, `Dirección`) + `"Sin asignar"` con `is_system=True`.
3. `ALTER TABLE employees ADD COLUMN department_id UUID NULL` (idem `teams`).
4. `UPDATE employees SET department_id = ...` con `JOIN` por `(tenant_id, name)`; lo que no matchee → `id` del "Sin asignar" del mismo tenant. Idem `teams`.
5. `ALTER TABLE employees ALTER COLUMN department_id SET NOT NULL` + `ADD FOREIGN KEY` + `DROP COLUMN department`. Idem `teams`.

Downgrade reversible: recrear columna string, copiar `name` desde el join al FK, drop FK + columna nueva.

**Rationale**:
- Atómico desde el punto de vista de la migración (todo en una `op.execute` o varios pasos secuenciales dentro del mismo `upgrade()`).
- Backfill garantiza que ningún empleado quede sin departamento (SC-006).
- Downgrade existe pero requiere que `Sin asignar` no se haya quedado solo (advertencia en docstring).

**Alternatives considered**:
- *Dos migraciones (introducir FK y luego eliminar columna)*: alarga el período de doble fuente de verdad. Como el ambiente actual es controlado (MVP), una sola migración es preferible.
- *Backfill por script Python separado*: rechazado, prefiero mantenerlo dentro de Alembic para que `upgrade head` deje el sistema consistente sin pasos manuales.

---

## Decisión 6: Catálogo de iconos y colores

**Decisión**:
- **Iconos**: subset curado de `lucide-react` (≈ 20 iconos relevantes: `ChefHat`, `Utensils`, `Coffee`, `Briefcase`, `Truck`, `Sparkles`, etc.) declarado en `frontend/src/config/constants.ts` como `DEPARTMENT_ICON_CATALOG`. El backend valida el icon name contra un `Enum` Pydantic con la misma lista (sincronización manual; documentada).
- **Colores**: campo `color: str` con validación regex `^#[0-9a-fA-F]{6}$`. Frontend ofrece un color picker tipo paleta predefinida (8-12 colores).
- **Defaults**: si el admin no elige icono/color, el backend asigna `icon="Building2"` y `color="#6b7280"` (gris neutro).

**Rationale**:
- Restringir iconos a un catálogo evita inputs arbitrarios y mantiene el tree-shaking de Lucide manejable.
- Color hex es estándar, validable y fácilmente serializable.
- Defaults sensatos garantizan que el ABM funciona aún si el admin sube el formulario sin elegir.

**Alternatives considered**:
- *Subida de SVG custom*: rechazado, scope creep para MVP.
- *Iconos por nombre arbitrario*: rechazado, sin garantía de existencia y rompe TS strict.

---

## Decisión 7: Cache de departamentos en frontend

**Decisión**: Hook `useDepartments()` que envuelve un `DepartmentsContext` con `useState/useEffect`. Carga inicial en el primer mount, expone `{ departments, loading, error, refresh }`. Las vistas que mutan (ABM) llaman `refresh()` tras crear/editar/borrar.

**Rationale**:
- Evita refetchear el catálogo en cada apertura de dropdown.
- Patrón ya usado para `AuthContext` y otros providers; mantiene consistencia.
- Lo suficientemente simple para MVP (sin react-query).

**Alternatives considered**:
- *React Query / SWR*: introducir una dep nueva por un solo recurso es overkill.
- *Llamar directo a `departmentService.getDepartments()` por componente*: rechazado por costo de red repetido.

---

## Decisión 8: Audit log

**Decisión**: Reuso del `security_logger` (logger estructurado JSON existente). Acciones emitidas:

| Acción | Trigger | Payload extra |
|---|---|---|
| `department.created` | `POST` exitoso | `department_id`, `name` |
| `department.updated` | `PUT` exitoso (cualquier campo) | `department_id`, `changed_fields` |
| `department.activated` / `department.deactivated` | toggle de `is_active` | `department_id` |
| `department.deleted` | `DELETE` exitoso | `department_id`, `employees_reassigned`, `teams_reassigned`, `target_department_id` |
| `department.delete_blocked` | intento sobre `is_system=True` | `department_id`, `reason="is_system"` |

**Rationale**:
- Constitución (Security Requirements, sección 3) exige logging de eventos de modificación.
- Los counts del delete son operativamente valiosos para auditoría.
- Reusar el logger existente evita inventar uno nuevo.

**Alternatives considered**:
- *Persistir audit en tabla dedicada*: hay backlog para auditoría persistente; mantenerlo en logger es coherente con el patrón actual.

---

## Decisión 9: Validación de unicidad case-insensitive

**Decisión**: Constraint único en DB sobre `(tenant_id, lower(name))` vía índice funcional PostgreSQL. La validación a nivel service se hace primero por consulta normalizada (lower); la DB queda como red de seguridad.

**Rationale**:
- Cumple FR-016 (case-insensitive).
- Defense-in-depth: si dos requests concurrentes intentan crear el mismo nombre con diferente capitalización, la DB rechaza la segunda con un `IntegrityError` que el service traduce a `ConflictError`.

**Alternatives considered**:
- *Solo validación a nivel app*: rechazado por race conditions.
- *Almacenar `name` siempre lowercase*: rechazado, pierde la presentación visual elegida por el admin.

---

## Decisión 10: Estructura del response anidado en Employee/Team

**Decisión**: Las respuestas de Employee y Team incluyen un objeto `department: { id: UUID, name: str, color: str, icon: str, is_system: bool }` en lugar del id pelado. Los requests de creación/edición aceptan `department_id: UUID` (no el objeto).

**Rationale**:
- El frontend necesita color/icono para renderizar el badge sin un segundo round-trip.
- Mantener la asimetría request-acepta-id, response-devuelve-objeto es un patrón común y se documenta en el contrato.

**Alternatives considered**:
- *Response sólo con id*: rechazado, fuerza al frontend a hacer joins en cliente.
- *Embed full Department en request*: rechazado, ineficiente y ambiguo (si los datos divergen).

---

## Open Questions

Ninguna. Todas las decisiones críticas están cerradas. Cualquier ajuste menor (ej: paleta exacta de colores por defecto) se resuelve durante la implementación sin impacto en spec o contrato.
