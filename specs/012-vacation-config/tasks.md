# Tasks: Configuración de Días de Vacaciones

**Input**: Design documents from `/specs/012-vacation-config/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/api.md ✅ · quickstart.md ✅

**User Stories**:
- US1 (P1): Configuración global del default de vacaciones (Admin/Moderador en `/settings`)
- US2 (P1): Override personalizado por empleado
- US3 (P1): Restricción de 2 meses de anticipación para el empleado
- US4 (P2): Reglas de año natural (vacaciones ≤ 31-dic, sin acumulación)
- US5 (P2): Auditoría visible de cambios de configuración

**Tests**: Incluidos en Phase 7 (Polish) como quality gate constitucional (≥80% coverage en servicios).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: Historia de usuario a la que pertenece la tarea
- Todas las rutas son relativas a la raíz del repositorio

---

## Phase 1: Setup — Fundamentos de Datos (Blocking)

**Purpose**: Esquema de base de datos y servicios auxiliares que bloquean TODAS las historias de usuario.

**⚠️ CRÍTICO**: Ninguna historia puede comenzar hasta que esta fase esté completa.

- [ ] T001 Crear modelo `AuditLog` en `backend/app/models/audit_log.py` con campos: `id` (UUID PK), `tenant_id` (FK tenant.id), `entity_type` (str), `entity_id` (str), `action` (str), `old_value` (str|None), `new_value` (str|None), `changed_by` (UUID FK user.id), `created_at` (datetime UTC); añadir índices `idx_audit_log_tenant_id`, `idx_audit_log_entity` sobre `(tenant_id, entity_type, entity_id)` y `idx_audit_log_created_at` sobre `(tenant_id, created_at)`
- [ ] T002 [P] Añadir campo `default_vacation_days: int = Field(default=30)` al modelo `Tenant` en `backend/app/models/tenant.py`
- [ ] T003 [P] Añadir campo `custom_vacation_days: int | None = Field(default=None)` al modelo `Employee` en `backend/app/models/employee.py`
- [ ] T004 Exportar `AuditLog` en `backend/app/models/__init__.py` (importación y lista `__all__`)
- [ ] T005 Generar migración Alembic con `alembic revision --autogenerate -m "add_vacation_config_and_audit_log"` en `backend/alembic/versions/`; revisar el archivo generado para confirmar: (1) `op.add_column('tenant', default_vacation_days NOT NULL DEFAULT 30)`, (2) `op.add_column('employee', custom_vacation_days NULLABLE)`, (3) `op.create_table('audit_log', ...)` con los 3 índices; ejecutar `alembic upgrade head`
- [ ] T006 Crear `backend/app/services/audit_service.py` con función `log(session: Session, tenant_id: UUID, entity_type: str, entity_id: str, action: str, old_value: str | None, new_value: str | None, changed_by: UUID) -> None` que instancia `AuditLog`, hace `session.add()` y `session.flush()` (el commit lo gestiona el caller)

**Checkpoint**: `alembic upgrade head` sin errores, `mypy app --strict` sin errores sobre los nuevos modelos.

---

## Phase 2: User Story 1 — Configuración Global del Default (Priority: P1) 🎯 MVP

**Goal**: Admin y Moderador pueden consultar y cambiar el número de días de vacaciones por defecto desde `/settings`. El cambio persiste y queda registrado en AuditLog.

**Independent Test**: Login como Admin → `GET /settings/vacations` devuelve `{"default_vacation_days": 30}` → `PUT /settings/vacations` con `{"default_vacation_days": 25}` devuelve 200 → volver a hacer GET y confirmar 25 → consultar AuditLog y ver entrada con `old_value="30"`, `new_value="25"`.

### Backend

- [ ] T007 [US1] Crear `backend/app/schemas/settings.py` con clases Pydantic v2 `VacationSettingsRead(BaseModel)` con campo `default_vacation_days: int` y `VacationSettingsUpdate(BaseModel)` con `default_vacation_days: int = Field(..., ge=1, le=365)`
- [ ] T008 [US1] Crear `backend/app/services/settings_service.py` con funciones: `get_vacation_settings(tenant_id: UUID, session: Session) -> Tenant` (devuelve el tenant) y `update_vacation_settings(tenant_id: UUID, new_days: int, changed_by: UUID, session: Session) -> Tenant` (lee el tenant, captura el old_value, actualiza `default_vacation_days`, llama `audit_service.log(...)` con `entity_type="tenant_vacation_config"`, `entity_id=str(tenant_id)`, `action="update_default_vacation_days"`, commit y devuelve el tenant actualizado); lanzar `NotFoundError` si el tenant no existe
- [ ] T009 [US1] Crear `backend/app/routers/settings.py` con router `APIRouter(prefix="/settings", tags=["settings"])` y dos endpoints: `GET /settings/vacations` (rol Admin o Moderador, llama `settings_service.get_vacation_settings`, devuelve `VacationSettingsRead`) y `PUT /settings/vacations` (rol Admin o Moderador, body `VacationSettingsUpdate`, llama `update_vacation_settings` con `changed_by=UUID(current_user["sub"])`, devuelve `VacationSettingsRead`); usar `handle_exceptions` decorator de `app.common.exceptions`
- [ ] T010 [US1] Registrar el nuevo settings router en `backend/app/main.py` con `app.include_router(settings_router)` (sin prefijo adicional ya que el router lleva `/settings`)

### Frontend

- [ ] T011 [P] [US1] Añadir a `frontend/src/types/models.ts` (o al fichero de tipos correspondiente exportado en `frontend/src/types/index.ts`) la interfaz `export interface VacationSettings { default_vacation_days: number }`
- [ ] T012 [P] [US1] Crear `frontend/src/services/settingsService.ts` con funciones `getVacationSettings(): Promise<VacationSettings>` (`GET /settings/vacations`) y `updateVacationSettings(days: number): Promise<VacationSettings>` (`PUT /settings/vacations`) usando `apiClient` de `frontend/src/services/apiClient.ts`
- [ ] T013 [US1] Crear `frontend/src/components/VacationConfigSection.tsx` con: estado local para `defaultDays` (número), estado `saving` (boolean), estado `error` (string|null), estado `success` (boolean); al montar llama `getVacationSettings()` y rellena el input; el formulario tiene un `<input type="number" min={1} max={365}>` con `<label className="text-sm font-medium text-base-content">` y `<p className="text-xs text-base-content/60 mt-1">` (sin `form-control` ni `label-text` — DaisyUI v5); botón "Guardar" que llama `updateVacationSettings(days)`, muestra toast/mensaje de éxito o `<p className="text-error text-xs mt-1">` en caso de error; sin historial de auditoría todavía (se añade en US5)
- [ ] T014 [US1] Modificar `frontend/src/views/SettingsView.tsx` para importar y renderizar `<VacationConfigSection />` dentro de la cuadrícula existente, solo visible para roles Admin y Moderador (leer rol del AuthContext o similar)

**Checkpoint**: `GET /settings/vacations` → 200; `PUT /settings/vacations` con valor válido → 200 y AuditLog creado; valor fuera de rango → 400; rol Empleado → 403; UI en `/settings` muestra la sección y guarda.

---

## Phase 3: User Story 2 — Override Personalizado por Empleado (Priority: P1)

**Goal**: Admin y Moderador pueden asignar un número personalizado de días de vacaciones a un empleado concreto desde la ficha de edición. El override queda en el empleado de forma permanente y se registra en AuditLog. Al crear el balance anual se usa el override si existe, o el default global si no.

**Independent Test**: Login Admin → PATCH `/employees/<uuid>` con `{"custom_vacation_days": 35}` → GET del empleado devuelve `custom_vacation_days: 35` → AuditLog contiene entrada con `entity_type="employee_vacation_config"` y `new_value="35"` → asegurarse que un nuevo `VacationBalance` creado para ese empleado tiene `total_days=35`.

### Backend

- [ ] T015 [US2] Modificar `backend/app/schemas/employee.py`: añadir `custom_vacation_days: int | None = None` a `EmployeeUpdate` (con validador Pydantic v2 `@field_validator` o `Annotated` para que cuando no sea None sea ≥1 y ≤365) y añadir `custom_vacation_days: int | None` a `EmployeeResponse`
- [ ] T016 [US2] Modificar `backend/app/services/employee_service.py` en la función `update()`: antes de aplicar los cambios, si `payload.custom_vacation_days` está presente en la actualización y difiere del valor actual, capturar `old_value = str(employee.custom_vacation_days)`, aplicar el cambio, y llamar `audit_service.log(session, tenant_id=employee.tenant_id, entity_type="employee_vacation_config", entity_id=str(employee.id), action="update_employee_vacation_days", old_value=old_value, new_value=str(new_value), changed_by=changed_by_user_id)` antes del commit; asegurarse de pasar el `changed_by` (user_id del actor) como nuevo parámetro de la función o desde el current_user en el router
- [ ] T017 [US2] Modificar `backend/app/services/vacation_service.py` en `_get_or_create_balance()`: cuando se crea un balance nuevo, cargar el `Employee` por `employee_id` y el `Tenant` por `tenant_id` de la sesión; calcular `total_days = employee.custom_vacation_days if employee.custom_vacation_days is not None else tenant.default_vacation_days`; usar ese valor en `VacationBalance(total_days=total_days, ...)`

### Frontend

- [ ] T018 [P] [US2] Añadir `custom_vacation_days?: number | null` a la interfaz `Employee` en `frontend/src/types/models.ts` (o el fichero donde esté definida)
- [ ] T019 [US2] Modificar `frontend/src/views/EmployeeListView.tsx` en el modal de edición: añadir campo de formulario "Días de vacaciones personalizados" (input numérico, vacío = null, rango 1–365) con `<label className="text-sm font-medium text-base-content">Días de vacaciones personalizados</label>`, input vacío inicialmente si `custom_vacation_days` es null, y `<p className="text-xs text-base-content/60 mt-1">Dejar vacío para usar el valor por defecto de la organización</p>`; incluir `custom_vacation_days` en el payload de `updateEmployee()`; añadir validación client-side: si no está vacío debe ser entero entre 1 y 365 (con `<p className="text-error text-xs mt-1">` para mostrar error)

**Checkpoint**: PATCH empleado con override válido → 200 + AuditLog; override null → sin AuditLog si ya era null, AuditLog si cambia de 35 a null; balance nuevo del empleado con override 35 → `total_days=35`; balance nuevo sin override → `total_days` igual al default global; UI muestra campo con placeholder correcto.

---

## Phase 4: User Story 3 — Restricción de Anticipación para el Empleado (Priority: P1)

**Goal**: El rol Empleado solo puede solicitar vacaciones con al menos 2 meses de anticipación en la fecha de inicio. Admin y Moderador no tienen esta restricción.

**Independent Test**: POST `/employee/vacation-requests` con `start_date = hoy + 30 días` → 400 `ADVANCE_NOTICE_REQUIRED`; misma solicitud con `start_date = hoy + 61 días` (≥ 2 meses) → 201; POST `/vacations` (admin) con `start_date = hoy + 5 días` → 201.

### Backend

- [ ] T020 [US3] Modificar `backend/app/common/exceptions.py`: añadir `class AdvanceNoticeRequiredError(DomainError)` con `code="ADVANCE_NOTICE_REQUIRED"` y mensaje por defecto `"Las vacaciones deben solicitarse con al menos 2 meses de anticipación"`; añadir manejo en `handle_exceptions` decorator mapeando a HTTP 400
- [ ] T021 [US3] Modificar `backend/app/services/vacation_service.py` en `create_request()`: añadir parámetro `is_employee_request: bool = False`; si `is_employee_request is True`, calcular `min_start = date.today() + relativedelta(months=2)` (importar `from dateutil.relativedelta import relativedelta`) y lanzar `AdvanceNoticeRequiredError()` si `start_date < min_start`; añadir esta validación antes de calcular `requested_days`
- [ ] T022 [US3] Modificar `backend/app/routers/vacations.py`: en `create_employee_vacation_request()` pasar `is_employee_request=True` a `vacation_service.create_request()`; en `create_vacation()` (ruta de admin/mod) pasar `is_employee_request=False` (o dejar el default); asegurarse de que `handle_exceptions` cubre `AdvanceNoticeRequiredError`

### Frontend

- [ ] T023 [US3] Modificar `frontend/src/views/EmployeeVacationView.tsx` en el handler de creación de solicitud: capturar error de la API, detectar `error.response?.data?.error?.code === "ADVANCE_NOTICE_REQUIRED"`, y mostrar `<p className="text-error text-xs mt-1">Las vacaciones deben solicitarse con al menos 2 meses de anticipación</p>` junto al campo de fecha de inicio

**Checkpoint**: Empleado con fecha < 2 meses → 400 con código correcto y mensaje en español en UI; Empleado con fecha ≥ 2 meses → 201; Admin misma fecha corta → 201 (sin restricción); UI muestra el mensaje de error en español junto al campo.

---

## Phase 5: User Story 4 — Reglas de Año Natural (Priority: P2)

**Goal**: Ningún usuario (de ningún rol) puede solicitar vacaciones cuyo `end_date` supere el 31 de diciembre del año de `start_date`. Los balances de un año nuevo arrancan con los días asignados sin acumular sobrantes del año anterior.

**Independent Test**: POST `/vacations` (admin) con `start_date=2026-12-20` y `end_date=2027-01-05` → 400; POST con `end_date=2026-12-31` → 201; comprobar que crear un `VacationBalance` para 2027 no hereda `used_days` de 2026.

### Backend

- [ ] T024 [US4] Modificar `backend/app/services/vacation_service.py` en `create_request()`: añadir validación inmediatamente después de calcular `year = start_date.year`: si `end_date > date(year, 12, 31)` lanzar `ValidationError("Las vacaciones deben disfrutarse dentro del año natural (antes del 31 de diciembre)", code="CALENDAR_YEAR_VIOLATION")`; esta validación aplica a TODOS los roles (no está dentro del bloque `is_employee_request`)

### Frontend

- [ ] T025 [US4] Modificar `frontend/src/views/EmployeeVacationView.tsx` y (si existe formulario en `VacationView.tsx` para admin/mod): capturar error `code === "VALIDATION_ERROR"` cuyo mensaje contenga "año natural" y mostrarlo en un `<p className="text-error text-xs mt-1">` junto al campo de fecha de fin

**Checkpoint**: Solicitud con `end_date` cruzando el 31-dic → 400 para cualquier rol; solicitud terminando el 31-dic → 201; `_get_or_create_balance` para 2027 de un empleado con `used_days` en 2026 → nuevo balance con `used_days=0`; UI muestra mensaje claro.

---

## Phase 6: User Story 5 — Auditoría Visible (Priority: P2)

**Goal**: Admin puede consultar el historial de todos los cambios de configuración de vacaciones desde `/settings`. El historial muestra quién, cuándo, qué cambió y de qué valor a cuál.

**Independent Test**: Login Admin → `GET /settings/audit-log` → lista con las entradas de todos los cambios anteriores (US1, US2), cada una con `changed_by_email`, `old_value`, `new_value`, `created_at`; Moderador → `GET /settings/audit-log` → 403; historial visible en UI de `/settings` sin salir de la vista.

### Backend

- [ ] T026 [US5] Crear `backend/app/schemas/audit_log.py` con clases Pydantic v2: `AuditLogRead(BaseModel)` con campos `id: uuid.UUID`, `entity_type: str`, `entity_id: str`, `action: str`, `old_value: str | None`, `new_value: str | None`, `changed_by: uuid.UUID`, `changed_by_email: str | None`, `created_at: datetime`; y `PaginatedAuditLog(BaseModel)` con `items: list[AuditLogRead]`, `total: int`, `page: int`, `size: int`, `pages: int`
- [ ] T027 [US5] Añadir endpoint `GET /settings/audit-log` en `backend/app/routers/settings.py`: solo rol Admin; query params `entity_type: str | None`, `entity_id: str | None`, `page: int = 1`, `size: int = 20` (máx 100); consultar `AuditLog` filtrando por `tenant_id` (siempre), y opcionalmente `entity_type` y `entity_id`; hacer join con `User` para obtener `changed_by_email`; ordenar por `created_at DESC`; paginar; devolver `PaginatedAuditLog`

### Frontend

- [ ] T028 [P] [US5] Añadir función `getAuditLog(params?: { entity_type?: string; entity_id?: string; page?: number; size?: number }): Promise<PaginatedAuditLog>` a `frontend/src/services/settingsService.ts` (`GET /settings/audit-log`)
- [ ] T029 [P] [US5] Añadir a `frontend/src/types/models.ts` (o el fichero de tipos correspondiente): `export interface AuditLogEntry { id: string; entity_type: string; entity_id: string; action: string; old_value: string | null; new_value: string | null; changed_by: string; changed_by_email: string | null; created_at: string }` y `export interface PaginatedAuditLog { items: AuditLogEntry[]; total: number; page: number; size: number; pages: number }`
- [ ] T030 [US5] Modificar `frontend/src/components/VacationConfigSection.tsx`: añadir sección colapsable (usando `<details>`/`<summary>` o un estado `showHistory`) que al abrirse llama `getAuditLog({ entity_type: "tenant_vacation_config" })` y muestra una tabla con columnas "Fecha", "Cambiado por", "Valor anterior", "Valor nuevo"; usar clases Tailwind/DaisyUI v5 para la tabla; mostrar "Sin cambios registrados" si la lista está vacía

**Checkpoint**: Admin: `GET /settings/audit-log` → 200 con entradas previas; Moderador/Empleado → 403; UI muestra el historial colapsable con las entradas correctas.

---

## Phase 7: Polish & Quality Gates

**Purpose**: Tests de regresión, type checking y linting para cumplir los quality gates constitucionales (≥80% cobertura en servicios).

- [ ] T031 [P] Crear `backend/tests/test_vacation_config.py` con tests para `settings_service`: get devuelve default 30 ✓; update cambia a 25 ✓; update con valor 0 → `ValidationError` ✓; update con valor 366 → `ValidationError` ✓; update genera entrada AuditLog ✓; endpoint 403 para Empleado ✓
- [ ] T032 [P] Crear `backend/tests/test_audit_service.py` con tests para `audit_service.log()`: entrada creada con todos los campos correctos ✓; `old_value=None` persiste correctamente ✓
- [ ] T033 [P] Ampliar/crear `backend/tests/test_vacation_service.py` con tests para las nuevas validaciones: `create_request` con `is_employee_request=True` y `start_date < hoy+2m` → `AdvanceNoticeRequiredError` ✓; mismo con `start_date = hoy+2m exacto` → pasa ✓; con `is_employee_request=False` → pasa sin importar fecha ✓; `end_date` cruzando 31-dic → `ValidationError` ✓; `_get_or_create_balance` con empleado con override 35 → `total_days=35` ✓; con override None y default global 28 → `total_days=28` ✓
- [ ] T034 [P] Ampliar `backend/tests/test_employee_service.py` (o crear): `update()` con cambio en `custom_vacation_days` → genera AuditLog ✓; cambio a None → AuditLog con `new_value="None"` ✓; sin cambio en el campo → no genera AuditLog ✓
- [ ] T035 Ejecutar quality gates backend: `mypy app --strict` (0 errores), `ruff check .` (0 errores), `pytest tests/ -v --cov=app --cov-report=term-missing` (todos en verde, ≥80% coverage en servicios nuevos/modificados)
- [ ] T036 Ejecutar quality gates frontend: `npm run lint` (0 errores), `npm run build` (build limpio sin errores TypeScript)

**Checkpoint Final**: Todos los quality gates pasan. Los 5 user stories son funcionales e independientemente testeables.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup/Foundational)**: Sin dependencias — empezar aquí. **Bloquea todo lo demás.**
- **Phase 2 (US1)**: Depende de Phase 1 completo (necesita AuditLog, audit_service, Tenant.default_vacation_days)
- **Phase 3 (US2)**: Depende de Phase 1 completo (necesita AuditLog, audit_service, Employee.custom_vacation_days). **Paralelo con Phase 2.**
- **Phase 4 (US3)**: Depende de Phase 1 completo (vacation_service). **Paralelo con Phases 2 y 3.**
- **Phase 5 (US4)**: Depende de Phase 1 completo (vacation_service). **Paralelo con Phases 2, 3 y 4.**
- **Phase 6 (US5)**: Depende de Phase 2 completa (necesita el router `/settings` para añadir el endpoint de audit-log) y Phase 1 (AuditLog model y schemas).
- **Phase 7 (Polish)**: Depende de todas las fases anteriores completas.

### User Story Dependencies

- **US1 (P1)**: Puede empezar tras Phase 1 — sin dependencias entre historias.
- **US2 (P1)**: Puede empezar tras Phase 1 — sin dependencias entre historias.
- **US3 (P1)**: Puede empezar tras Phase 1 — sin dependencias entre historias.
- **US4 (P2)**: Puede empezar tras Phase 1 — sin dependencias entre historias.
- **US5 (P2)**: Depende de US1 (necesita el router `/settings` para añadir endpoint de audit-log); no depende de US2, US3, US4.

### Within Each User Story

- Backend models/schemas → services → routers
- Frontend types → services → components/views
- Backend y frontend de la misma historia son paralelizables entre sí

### Parallel Opportunities

- T002 (Tenant field) y T003 (Employee field) → paralelos entre sí
- Tras Phase 1: US1 (Phase 2), US2 (Phase 3), US3 (Phase 4) y US4 (Phase 5) → todos en paralelo
- Dentro de US1: T011 (types) y T012 (settingsService) son paralelos; T013 (componente) y T007-T010 (backend) son paralelos
- Tests T031, T032, T033, T034 → todos en paralelo

---

## Parallel Example: Phase 1

```bash
# En paralelo (archivos distintos, sin bloqueo):
Task T002: "Añadir default_vacation_days en backend/app/models/tenant.py"
Task T003: "Añadir custom_vacation_days en backend/app/models/employee.py"

# Secuencial tras T002, T003, T001:
Task T004: "Exportar AuditLog en backend/app/models/__init__.py"
Task T005: "Generar y aplicar migración Alembic"
Task T006: "Crear backend/app/services/audit_service.py"
```

## Parallel Example: US1 + US2 + US3 + US4 (tras Phase 1)

```bash
# Todos en paralelo (diferentes partes del sistema):
Developer A → Phase 2 (US1): settings_service + router + frontend VacationConfigSection
Developer B → Phase 3 (US2): employee schemas + employee_service update + frontend campo empleado  
Developer C → Phase 4 (US3): AdvanceNoticeRequiredError + vacation_service + frontend error
Developer D → Phase 5 (US4): validación año natural en vacation_service + frontend error
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3, las tres P1)

1. Completar **Phase 1** (Setup) — migración + modelos + audit_service
2. Completar **Phase 2** (US1) — configuración global en `/settings`
3. Completar **Phase 3** (US2) — override por empleado + balance correcto
4. Completar **Phase 4** (US3) — restricción de 2 meses para empleado
5. **PARAR Y VALIDAR**: Las 3 P1 son funcionales y testeables
6. Desplegar como MVP si todas las P1 pasan QA

### Incremental Delivery

1. Phase 1 → Foundation ready
2. Phase 2 → US1 funcional (default global configurable)
3. Phase 3 → US2 funcional (override por empleado)
4. Phase 4 → US3 funcional (restricción anticipación)
5. Phase 5 → US4 funcional (año natural)
6. Phase 6 → US5 funcional (historial auditoría visible)
7. Phase 7 → Quality gates (tests, mypy, ruff, lint)

### Quickstart Validation (tras Phase 7)

Seguir los smoke tests de `quickstart.md` para validar el stack completo en Docker.

---

## Notes

- `[P]` = archivos distintos, sin dependencias entre las tareas marcadas
- Cada user story es independientemente completable y testeable
- Usar `from dateutil.relativedelta import relativedelta` para el cálculo de 2 meses (ya disponible como dependencia transitiva)
- DaisyUI v5: NO usar `form-control`, `label-text`, `label-text-alt` — usar `flex flex-col gap-1`, `text-sm font-medium`, `text-xs text-base-content/60`
- El commit después de completar la Phase 1 permite que las Phases 2-5 arranquen en paralelo
- `audit_service.log()` usa `session.flush()` (no `commit`); el commit queda en manos del servicio llamador para mantener la atomicidad
