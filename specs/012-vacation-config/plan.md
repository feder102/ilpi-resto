# Implementation Plan: Configuración de Días de Vacaciones

**Branch**: `012-vacation-config` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

---

## Summary

Ampliar el sistema de vacaciones existente para permitir:
(1) configurar el número de días de vacaciones por defecto del tenant desde `/settings` (Admin/Moderador),
(2) asignar un override personalizado por empleado,
(3) aplicar las restricciones de 2 meses de anticipación para empleados y año natural para todos,
y (4) dejar auditoría genérica de cada cambio de configuración.

El enfoque mínimo-invasivo extiende los modelos `Tenant` y `Employee` con dos nuevos campos, crea la tabla `AuditLog` genérica, añade un router `/settings`, y amplía `SettingsView.tsx` y la ficha de empleado en el frontend.

---

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript 5.8 (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Alembic, Pydantic v2, python-dateutil; React 19, DaisyUI v5, Axios
**Storage**: PostgreSQL 16
**Testing**: pytest + httpx (backend), Vitest + React Testing Library (frontend)
**Target Platform**: Linux server (Docker) + SPA navegador
**Project Type**: Web service (backend) + SPA (frontend)
**Performance Goals**: API <200ms p95 (consistente con constitution.md §X)
**Constraints**: mypy --strict sin errores; ruff sin errores; DaisyUI v5 API (sin `form-control`, `label-text`)
**Scale/Scope**: ≤500 empleados, mono-tenant MVP

---

## Constitution Check

### Pilar I: Clean Architecture ✅

- **Routers** (`settings.py`, `employees.py`, `vacations.py`): solo HTTP — serialización, roles, response format.
- **Services** (`settings_service.py`, `audit_service.py`, `vacation_service.py`, `employee_service.py`): toda la lógica de negocio — validación 2 meses, validación año natural, resolución override/default, escritura AuditLog.
- **Models** (`tenant.py`, `employee.py`, `audit_log.py`): entidades puras sin lógica de dominio.
- **Sin queries en routers ni frontend**.

### Pilar II: Strict Modularity ✅

- `audit_service.py` = un solo propósito (escribir AuditLog).
- `settings_service.py` = un solo propósito (CRUD de configuración del tenant).
- `AuditLog` en su propio archivo de modelo.
- Sin dependencias circulares: `settings_service` → `audit_service` → `models`.

### Pilar III: Strict Type Safety ✅

- `custom_vacation_days: int | None` en `Employee` y schemas.
- `default_vacation_days: int` en `Tenant`.
- `AuditLog` completamente tipado.
- Nuevos schemas Pydantic v2: `VacationSettingsRead`, `VacationSettingsUpdate`, `AuditLogRead`.
- Frontend: tipos `VacationSettings`, `AuditLogEntry` en `types/models.ts`; no `any`.

### Pilar IV: Production-Ready Deployment ✅

- Migración Alembic con `upgrade` + `downgrade`.
- `seed.py` actualizado para respetar `default_vacation_days=30` al crear el tenant ILPI.
- Logs estructurados JSON en intentos de acceso denegado y cambios de configuración.

### Pilar V: Security-First ✅

- RBAC en capa de servicio: `require_role("Admin", "Moderador")` en settings; solo Admin para audit-log.
- Employees no pueden modificar su `custom_vacation_days` (ignorado en el backend si llega).
- AuditLog con `changed_by` trazable.
- Nuevo código de error `ADVANCE_NOTICE_REQUIRED` sin stack trace en respuesta al cliente.

**Gate Result**: PASS — ningún pilar violado.

---

## Project Structure

### Documentation (this feature)

```text
specs/012-vacation-config/
├── spec.md              ✅ (spec phase)
├── research.md          ✅ (plan phase — fase 0)
├── data-model.md        ✅ (plan phase — fase 1)
├── contracts/api.md     ✅ (plan phase — fase 1)
├── quickstart.md        ✅ (plan phase — fase 1)
├── plan.md              ✅ Este archivo
├── checklists/requirements.md  ✅ (spec phase)
└── tasks.md             ⏳ (tasks phase — /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   ├── tenant.py                 [MODIFICAR] +default_vacation_days
│   │   ├── employee.py               [MODIFICAR] +custom_vacation_days
│   │   ├── audit_log.py              [CREAR] AuditLog model
│   │   └── __init__.py               [MODIFICAR] +AuditLog export
│   ├── schemas/
│   │   ├── settings.py               [CREAR] VacationSettingsRead, VacationSettingsUpdate
│   │   ├── audit_log.py              [CREAR] AuditLogRead, PaginatedAuditLog
│   │   └── employee.py               [MODIFICAR] +custom_vacation_days en Update y Response
│   ├── services/
│   │   ├── audit_service.py          [CREAR] log() helper
│   │   ├── settings_service.py       [CREAR] get/update vacation settings
│   │   ├── vacation_service.py       [MODIFICAR] validaciones + _get_or_create_balance
│   │   └── employee_service.py       [MODIFICAR] audit en update()
│   ├── routers/
│   │   ├── settings.py               [CREAR] GET/PUT /settings/vacations, GET /settings/audit-log
│   │   └── main.py                   [MODIFICAR] registrar settings router
│   └── seed.py                       [VERIFICAR] default 30 explícito al crear tenant
│
├── alembic/versions/
│   └── xxxx_add_vacation_config_and_audit_log.py  [CREAR]
│
└── tests/
    ├── test_vacation_config.py       [CREAR] unit tests settings_service
    ├── test_audit_service.py         [CREAR] unit tests audit_service
    └── test_vacation_service.py      [MODIFICAR] tests de nuevas validaciones

frontend/
├── src/
│   ├── types/
│   │   └── models.ts                 [MODIFICAR] +VacationSettings, AuditLogEntry, Employee.custom_vacation_days
│   ├── services/
│   │   └── settingsService.ts        [CREAR] getVacationSettings, updateVacationSettings, getAuditLog
│   ├── views/
│   │   └── SettingsView.tsx          [MODIFICAR] +sección Configuración de Vacaciones
│   └── components/
│       ├── VacationConfigSection.tsx [CREAR] form + audit history
│       └── (ficha empleado existente) [MODIFICAR] +campo custom_vacation_days
```

---

## Implementation Phases

### Fase A: Backend — Modelos y Migración

**Objetivo**: Esquema de base de datos actualizado.

1. `audit_log.py` — nuevo modelo `AuditLog` con todos los campos e índices.
2. `tenant.py` — añadir `default_vacation_days: int = Field(default=30)`.
3. `employee.py` — añadir `custom_vacation_days: int | None = Field(default=None)`.
4. `models/__init__.py` — exportar `AuditLog`.
5. `alembic revision --autogenerate -m "add_vacation_config_and_audit_log"` + revisar + `alembic upgrade head`.

---

### Fase B: Backend — Schemas

**Objetivo**: DTOs Pydantic v2 para los nuevos contratos.

1. `schemas/settings.py` — `VacationSettingsRead`, `VacationSettingsUpdate(default_vacation_days: int = Field(ge=1, le=365))`.
2. `schemas/audit_log.py` — `AuditLogRead`, `PaginatedAuditLog`.
3. `schemas/employee.py` — añadir `custom_vacation_days: int | None` a `EmployeeUpdate` y `EmployeeResponse`. Añadir `Field(ge=1, le=365)` cuando no es None (usar validator Pydantic v2).

---

### Fase C: Backend — Servicios

**Objetivo**: Toda la lógica de negocio.

1. **`audit_service.py`** — función `log(session, tenant_id, entity_type, entity_id, action, old_value, new_value, changed_by)` que crea y persiste `AuditLog`.
2. **`settings_service.py`**:
   - `get_vacation_settings(tenant_id, session) -> Tenant` — obtiene tenant.
   - `update_vacation_settings(tenant_id, new_days, changed_by, session) -> Tenant` — actualiza `default_vacation_days`, llama `audit_service.log`, commit.
3. **`vacation_service.py`** — modificar:
   - `_get_or_create_balance`: cargar `Employee` y `Tenant` para calcular `total_days` correcto.
   - `create_request`: añadir parámetro `is_employee_request: bool = False`. Si `True`, validar `start_date >= date.today() + relativedelta(months=2)` con `ValidationError("Las vacaciones deben solicitarse con al menos 2 meses de anticipación", code="ADVANCE_NOTICE_REQUIRED")`. Para todos los roles, validar `end_date <= date(start_date.year, 12, 31)`.
4. **`employee_service.py`** — en `update()`: si `custom_vacation_days` cambia, llamar `audit_service.log` antes del commit.

---

### Fase D: Backend — Routers

**Objetivo**: Endpoints HTTP.

1. **`routers/settings.py`** (nuevo):
   - `GET /settings/vacations` — `AdminOrMod` dep — llama `settings_service.get_vacation_settings`.
   - `PUT /settings/vacations` — `AdminOrMod` dep — llama `settings_service.update_vacation_settings`.
   - `GET /settings/audit-log` — `Admin` dep — consulta `AuditLog` paginado con filtros opcionales, join con `User` para `changed_by_email`.
2. **`main.py`** — registrar `settings_router` con prefijo `/settings`.
3. **`routers/vacations.py`** — en `create_employee_vacation_request` pasar `is_employee_request=True`; en `create_vacation` (admin) pasar `False`.

---

### Fase E: Backend — Tests

**Objetivo**: Cobertura de las nuevas reglas de negocio.

Tests a crear/ampliar:

| Test | Escenario |
|---|---|
| `test_vacation_config.py` | get/update default global; validación rango 1-365; auditoría generada |
| `test_vacation_config.py` | RBAC: empleado rechazado con 403 |
| `test_vacation_service.py` | anticipación 2m empleado: falla / pasa en límite exacto |
| `test_vacation_service.py` | admin crea sin restricción anticipación |
| `test_vacation_service.py` | año natural: falla en 31-dic cruzado, pasa en 30-dic |
| `test_vacation_service.py` | `_get_or_create_balance` usa override de empleado |
| `test_vacation_service.py` | `_get_or_create_balance` usa default global si override es null |
| `test_audit_service.py` | entrada creada con campos correctos |
| `test_employee_service.py` | update con custom_vacation_days registra auditoría |

---

### Fase F: Frontend — Types y Services

**Objetivo**: Contratos TypeScript + capa de datos.

1. **`types/models.ts`**:
   - Añadir `custom_vacation_days?: number | null` a interfaz `Employee`.
   - Añadir `export interface VacationSettings { default_vacation_days: number }`.
   - Añadir `export interface AuditLogEntry { id, entity_type, entity_id, action, old_value, new_value, changed_by, changed_by_email, created_at }`.
2. **`services/settingsService.ts`** (nuevo):
   - `getVacationSettings(): Promise<VacationSettings>`
   - `updateVacationSettings(days: number): Promise<VacationSettings>`
   - `getAuditLog(params?): Promise<PaginatedResponse<AuditLogEntry>>`

---

### Fase G: Frontend — UI

**Objetivo**: Vistas y componentes.

1. **`components/VacationConfigSection.tsx`** (nuevo):
   - Formulario con input numérico (1-365), botón "Guardar", feedback de éxito/error en español.
   - Tabla colapsable de historial de auditoría (últimas N entradas: quién, cuándo, de → a).
   - DaisyUI v5: `flex flex-col gap-1`; `<label className="text-sm font-medium text-base-content">`; `<p className="text-error text-xs mt-1">`.
2. **`views/SettingsView.tsx`** — importar y renderizar `<VacationConfigSection>` solo si rol Admin o Moderador.
3. **Vista de edición de empleado** (identificar el componente existente):
   - Añadir campo "Días de vacaciones personalizados" con `placeholder="Usar valor por defecto de la organización"` y texto auxiliar: *"Dejar vacío para usar el valor por defecto"*.
   - Validación client-side: si no vacío, debe ser entero 1-365.
4. **`views/EmployeeVacationView.tsx`** — en el handler de error de `createEmployeeVacationRequest`, detectar `code === "ADVANCE_NOTICE_REQUIRED"` y mostrar el mensaje en español junto al campo de fecha.

---

## Reused Patterns

| Patrón | Ubicación en codebase |
|---|---|
| RBAC dependency | `backend/app/dependencies.py: require_role()` |
| DomainError jerarquía | `backend/app/common/exceptions.py` |
| Paginación de lista | `vacation_service.list_requests()` — mismo patrón para audit-log |
| Service session pattern | `(session: Session, tenant_id: UUID, ...)` en todos los servicios |
| Frontend service pattern | `vacationService.ts` / `apiClient.ts` |
| DaisyUI v5 form pattern | `flex flex-col gap-1` + `text-sm font-medium` (CLAUDE.md) |

---

## Complexity Tracking

Sin violaciones constitucionales. No se introduce complejidad adicional sobre lo necesario.

---

## Verification

```bash
# Backend
cd backend
alembic upgrade head              # migración sin errores
mypy app --strict                 # 0 errores
ruff check .                      # 0 errores
pytest tests/ -v                  # todos en verde

# Frontend
cd frontend
npm run lint                      # 0 errores
npm run build                     # build limpio

# E2E (Swagger UI / manual)
# 1. GET /settings/vacations → 200 con default_vacation_days=30
# 2. PUT /settings/vacations {"default_vacation_days":25} → 200
# 3. GET /settings/audit-log → entrada de cambio 30→25
# 4. PATCH /employees/<uuid> {"custom_vacation_days":35} → 200
# 5. POST /employee/vacation-requests con start_date<2m → 400 ADVANCE_NOTICE_REQUIRED
# 6. POST /employee/vacation-requests con start_date≥2m → 201
# 7. POST /vacations admin con fechas cruzando 31-dic → 400
```
