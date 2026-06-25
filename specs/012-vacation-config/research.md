# Research: Configuración de Días de Vacaciones

**Branch**: `012-vacation-config` | **Date**: 2026-06-25 | **Phase**: 0 — Research

---

## 1. Cómo almacenar el default global de días de vacaciones

**Decision**: Añadir columna `default_vacation_days: int` (default 30) al modelo `Tenant` existente (`backend/app/models/tenant.py`).

**Rationale**:
- El Tenant ya es el contenedor multi-tenant; añadir una columna evita una tabla extra.
- La cadena de join es O(1): al crear el balance se lee el Tenant por `tenant_id` (ya en memoria en muchas transacciones).
- Consistente con el patrón existente: `Tenant.timezone`, `Tenant.locale`.

**Alternatives considered**:
- Tabla separada `TenantVacationConfig` (1:1 con Tenant) — más flexible pero sobre-engineering para un solo campo en MVP.
- Variable de entorno / `config.py` — no permite cambios en runtime sin redeploy.

---

## 2. Cómo modelar el override por empleado

**Decision**: Campo `custom_vacation_days: int | None` (default `None`) en `Employee` (`backend/app/models/employee.py`). `None` = usar default global.

**Rationale**:
- Permanente y sencillo: un solo campo en la fila del empleado.
- La lógica de resolución es `employee.custom_vacation_days or tenant.default_vacation_days` — una línea.
- Sin tabla adicional; no hay historial de overrides por año (fuera de scope).

**Alternatives considered**:
- Tabla `EmployeeVacationConfig` (1:N por año) — necesario solo si se requiere historial de overrides por año (no en scope).
- Campo en `VacationBalance` — afectaría balances existentes; riesgo de inconsistencia.

---

## 3. Cómo implementar la auditoría

**Decision**: Nueva tabla `AuditLog` genérica en `backend/app/models/audit_log.py`, con `audit_service.py` como helper.

**Campos**: `id` (UUID PK), `tenant_id` (FK Tenant), `entity_type` (str), `entity_id` (str — UUID o int serializado), `action` (str), `old_value` (str | None), `new_value` (str | None), `changed_by` (UUID FK User), `created_at` (datetime UTC).

**Rationale**:
- Genérica y reutilizable; futuros features (cambio de horarios, configuración de departamentos) pueden usar la misma tabla.
- `entity_type` + `entity_id` como cadenas permiten referencias a cualquier entidad sin FKs.
- `changed_by` es UUID y referencia a User, consistente con `VacationRequest.reviewed_by`.
- Tabla append-only: sin `updated_at`, sin soft-delete.

**Alternatives considered**:
- Tabla `VacationConfigAuditLog` específica — más simple a corto plazo pero crea fragmentación para futuros features.
- Logs estructurados (JSON en fichero) — no consultables desde UI sin infraestructura extra.

---

## 4. Restricción de 2 meses de anticipación

**Decision**: Validar en `vacation_service.create_request` mediante nuevo parámetro `is_employee_request: bool`. Si `True`, validar `start_date >= date.today() + relativedelta(months=2)`.

**Librería**: `python-dateutil.relativedelta` (ya disponible como dependencia transitiva). Alternativa compatible: `from dateutil.relativedelta import relativedelta`.

**Rationale**:
- La lógica de negocio pertenece al servicio (Pilar I Clean Architecture).
- Un flag `is_employee_request` es el mínimo cambio en la firma; no requiere refactorizar los dos call-sites (`POST /vacations` admin vs `POST /employee/vacation-requests` empleado).
- `relativedelta` para meses calendario, consistente con DR-003 (días naturales) y con el Estatuto de los Trabajadores.

**Alternatives considered**:
- 60 días fijos: más simple, pero no respeta meses de distinta longitud (feb, meses cortos).
- Pasar el rol del usuario al servicio: más acoplamiento; el flag booleano es más explícito.

---

## 5. Validación de año natural (vacaciones ≤ 31-dic del año de inicio)

**Decision**: En `create_request`, tras calcular `year = start_date.year`, validar `end_date <= date(year, 12, 31)`.

**Rationale**: Mínima: una sola línea antes del balance check. Se aplica a todos los roles (no hay excepciones a la regla del año natural).

---

## 6. Cómo propagar el override/default al crear VacationBalance

**Decision**: En `_get_or_create_balance`, cuando se crea un balance nuevo:
1. Cargar `Employee` por `employee_id`.
2. Si `employee.custom_vacation_days` no es None → usar ese valor.
3. Si None → cargar `Tenant` por `tenant_id` → usar `tenant.default_vacation_days`.

**Rationale**: `_get_or_create_balance` ya es el único punto de creación de balances; centralizar la lógica aquí cumple Single Responsibility.

**Alternatives considered**:
- Pasar `total_days` explícitamente desde el caller — más acoplamiento; los callers no deberían conocer la regla.

---

## 7. Nuevos endpoints de configuración

**Decision**: Router `backend/app/routers/settings.py` (nuevo) con prefijo `/settings`, registrado en `main.py`.

| Endpoint | Roles | Descripción |
|---|---|---|
| `GET /settings/vacations` | Admin, Moderador | Lee `default_vacation_days` del tenant |
| `PUT /settings/vacations` | Admin, Moderador | Actualiza default y escribe AuditLog |
| `GET /settings/audit-log` | Admin | Lista AuditLog del tenant (paginado) |

**Rationale**:
- Separar en su propio router mantiene Single Responsibility (Pilar II).
- El Moderador puede configurar vacaciones (no es "Configuración de sistema" en el sentido constitucional); solo Admin ve el audit log completo.

---

## 8. Frontend: estructura de componentes

**Decision**:
- `SettingsView.tsx` (existente) recibe una nueva sección `<VacationConfigSection>` extraída como componente propio.
- `settingsService.ts` (nuevo) centraliza las llamadas a `/settings/vacations` y `/settings/audit-log`.
- La ficha de empleado (vista de edición) añade el campo `custom_vacation_days` vía el `employeeService` existente.
- `EmployeeVacationView.tsx` gestiona el error 400 de anticipación con mensaje en español.

**Rationale**: Cumple Single Responsibility; no contamina componentes existentes con lógica nueva.

---

## 9. Migración Alembic

**Decision**: Una sola migración `add_vacation_config_and_audit_log` que:
1. Añade `tenant.default_vacation_days` (INTEGER NOT NULL DEFAULT 30).
2. Añade `employee.custom_vacation_days` (INTEGER NULL).
3. Crea tabla `audit_log` con índices sobre `(tenant_id)`, `(entity_type, entity_id)` y `created_at`.

**Rationale**: Una revisión atómica; evita dependencias de orden entre migraciones parciales.

---

## 10. Notas de mypy / tipo estricto

- `relativedelta` devuelve `relativedelta`; la suma con `date` produce `datetime`. Se debe llamar `(date.today() + relativedelta(months=2))` y castear con `.date()` si es necesario (en realidad `relativedelta` con `date` devuelve `date`).
- El nuevo campo `custom_vacation_days: int | None` en `Employee` requiere `Optional[int]` en Pydantic EmployeeUpdate y EmployeeResponse para que pase `mypy --strict`.
- `AuditLog.entity_id` como `str` evita un generic UUID que complicaría la FK polimórfica.
