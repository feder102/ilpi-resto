---

description: "Tasks for feature 014-department-abm"
---

# Tasks: ABM de Departamentos

**Input**: Design documents from `/specs/014-department-abm/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/departments-api.md, quickstart.md
**Tests**: Incluidos. La Constitución (Development Workflow & Quality Gates §3) exige que toda feature nueva incorpore tests; el spec define escenarios de aceptación verificables que se traducen en tests de servicio y de router.
**Organization**: Tareas agrupadas por user story (P1 → P2 → P3) para permitir entrega incremental. Cada historia es un slice MVP independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivo distinto, sin dependencia pendiente).
- **[Story]**: A qué user story pertenece (US1, US2, US3).
- Cada tarea incluye la ruta absoluta o relativa al repo de los archivos involucrados.

## Path Conventions

- Backend Python: `backend/app/**`
- Backend tests: `backend/tests/**`
- Alembic: `backend/alembic/versions/**`
- Frontend React: `frontend/src/**`
- Frontend tests: `frontend/src/**/__tests__/**` o `frontend/src/views/*.test.tsx`

---

## Phase 1: Setup

**Purpose**: Preparación de la rama y verificación del estado del repo. La feature reutiliza el stack ya configurado (Python 3.12 + FastAPI + SQLModel + Alembic; React 19 + TS + DaisyUI v5), por lo que no requiere nuevas dependencias.

- [ ] T001 Confirmar que el working tree está sobre la branch `feature/department-abm` y limpia (`git status`, `git branch --show-current`). Si no, hacer checkout antes de empezar.
- [ ] T002 [P] Verificar que `backend/requirements.txt` y `frontend/package.json` están al día (`pip install -r backend/requirements.txt`, `npm install --prefix frontend`). No se agregan dependencias nuevas en esta feature.
- [ ] T003 [P] Confirmar que las gates de calidad pasan sobre `main` antes de empezar (baseline): `cd backend && mypy app --strict && ruff check . && pytest -x` y `cd frontend && npm run lint && npm run build`. Documentar cualquier falla preexistente como pre-condición conocida.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que las tres user stories consumen: nueva entidad `Department`, FK en `Employee`/`Team`, migración con backfill, schemas Pydantic base, hook frontend `useDepartments`. **Toda US queda bloqueada hasta cerrar esta fase.**

### Backend — modelo, schemas, servicio base

- [ ] T004 [P] Crear modelo SQLModel `Department` en `backend/app/models/department.py` con campos `id, tenant_id, name, description, color, icon, is_system, is_active, created_at, updated_at`, validador Pydantic del color y constraint único `(tenant_id, lower(name))` declarado en `__table_args__` siguiendo el patrón de `backend/app/models/team.py`.
- [ ] T005 [P] Re-exportar `Department` en `backend/app/models/__init__.py` para que Alembic lo descubra junto al resto de modelos.
- [ ] T006 [P] Crear schemas Pydantic en `backend/app/schemas/department.py`: `DepartmentCreate`, `DepartmentUpdate`, `DepartmentResponse`, `DepartmentDeletePreview`, `DepartmentDeleteResult`, además de un enum `DepartmentIcon` con el catálogo de iconos permitidos (referenciado en research §6).
- [ ] T007 [P] Definir el catálogo de iconos en `backend/app/common/department_icons.py` (constante `ALLOWED_DEPARTMENT_ICONS`) y reusarlo en el enum del schema y en el seed.
- [ ] T008 [US-all] Implementar el esqueleto del servicio en `backend/app/services/department_service.py` con: `list_departments`, `get_by_id`, `ensure_system_department(tenant_id)` (idempotente), `_assert_not_system`, `_assert_unique_name`, helpers de auditoría. Depende de T004, T006.

### Backend — migración Alembic con backfill

- [ ] T009 [US-all] Generar migración Alembic `backend/alembic/versions/<ts>_add_departments_table.py` siguiendo data-model §"Migración Alembic": crear tabla `departments`, seed inicial por tenant (incluyendo `Sin asignar` con `is_system=TRUE` y los 4 defaults), agregar columna `department_id UUID NULL` a `employees` y `teams`, backfill por `(tenant_id, lower(name))` con fallback a "Sin asignar", promover a `NOT NULL` + `FK`, dropear columna string `department`, recrear constraint compuesto de `teams`, agregar índices. Incluir downgrade reversible con docstring de pérdida de datos.
- [ ] T010 [US-all] Adaptar `backend/app/seed.py` para que use `department_id` (lookup por nombre + creación idempotente del depto sistema vía `ensure_system_department`) en lugar del string `department` al crear los empleados seed.

### Backend — refactor Employee/Team string → FK

- [ ] T011 [P] Modificar `backend/app/models/employee.py`: reemplazar `department: str` por `department_id: UUID = Field(foreign_key="departments.id", index=True)` y relación `department: "Department" = Relationship(back_populates="employees")`.
- [ ] T012 [P] Modificar `backend/app/models/team.py` análogamente; actualizar `__table_args__` para que el constraint compuesto incluya `department_id`.
- [ ] T013 [P] Modificar `backend/app/schemas/employee.py`: `EmployeeCreate.department` → `department_id: UUID`; `EmployeeUpdate.department` → `department_id: UUID | None`; `EmployeeResponse.department` → objeto anidado `{ id, name, color, icon, is_system }`.
- [ ] T014 [P] Modificar `backend/app/schemas/team.py` con la misma transformación de campos.
- [ ] T015 [US-all] Actualizar `backend/app/services/employee_service.py`: validar `department_id` (existe, mismo tenant, `is_active=true` al alta/edición), filtros de listado por `department_id`, mapeo de `_to_response` a la nueva estructura anidada. Depende de T008, T011, T013.
- [ ] T016 [US-all] Actualizar `backend/app/services/team_service.py` con la misma lógica que T015. Depende de T008, T012, T014.
- [ ] T017 [US-all] Actualizar `backend/app/services/moderator_service.py`: `get_moderator_department` devuelve `Department` (no string); `enforce_department_scope` compara `UUID`; `get_department_name` deriva del objeto. Depende de T015.
- [ ] T018 [P] Actualizar `backend/app/routers/employees.py` para aceptar query param `department_id: UUID | None` en vez de `department: str`. Depende de T015.
- [ ] T019 [P] Actualizar `backend/app/routers/teams.py` análogamente. Depende de T016.
- [ ] T020 [P] Actualizar `backend/app/routers/dashboard.py` y `backend/app/routers/time_tracking.py` para agrupar y filtrar por `department_id`; las respuestas incluyen `department: { id, name, color, icon }` por bucket.
- [ ] T021 [P] Actualizar `backend/app/routers/moderator.py` y endpoints derivados para resolver el scope por `department_id`. Depende de T017.

### Frontend — tipos, constantes y servicio base

- [ ] T022 [P] Reemplazar el enum hardcoded en `frontend/src/types/models.ts`: eliminar `Department` (const-as-enum) y agregar `interface Department { id, name, description?, color, icon, isSystem, isActive }`; actualizar `EmployeeResponse.department` al objeto anidado y `EmployeeCreatePayload`/`EmployeeUpdatePayload` para usar `department_id: string`.
- [ ] T023 [P] Eliminar `DEPARTMENTS` de `frontend/src/config/constants.ts` y agregar `DEPARTMENT_ICON_CATALOG` (array de nombres Lucide alineado con el enum backend) + `DEPARTMENT_COLOR_PALETTE` (paleta de 8-12 hex). Mantener cualquier export que no esté ligado al enum viejo.
- [ ] T024 [P] Crear `frontend/src/services/departmentService.ts` con `getDepartments({ includeInactive?, search? })`, `getDepartment(id)`, `createDepartment(payload)`, `updateDepartment(id, payload)`, `getDeletePreview(id)`, `deleteDepartment(id)`. Usar el cliente Axios existente y tipar contra `Department` + DTOs nuevos.
- [ ] T025 [US-all] Crear `frontend/src/hooks/useDepartments.ts` + `frontend/src/context/DepartmentsContext.tsx`: provider que carga el listado en mount, expone `{ departments, loading, error, refresh }` y se monta dentro de `AuthProvider` en `frontend/src/main.tsx` o `frontend/src/App.tsx`.

**Checkpoint**: tabla `departments` creada, seed inicial corre, `Employee`/`Team` ya hablan FK end-to-end, frontend conoce el nuevo tipo y consume el listado vía hook. A partir de acá las US se pueden trabajar en paralelo.

---

## Phase 3: User Story 1 — Admin gestiona el catálogo de departamentos (Priority: P1) 🎯 MVP

**Goal**: el Admin puede ver el listado y crear nuevos departamentos desde una sección dedicada; los nuevos departamentos aparecen automáticamente en los selectores de empleados/equipos. Moderador y Empleado pueden leer la lista (para sus dropdowns) pero no acceder al ABM.

**Independent Test**: validar el quickstart §3 pasos 1-4 (login Admin → entra a "Departamentos" → ve los 5 default → crea "Delivery" → aparece en el dropdown de Empleados).

### Tests for User Story 1

- [ ] T026 [P] [US1] Test contract en `backend/tests/test_departments_router.py::test_list_departments_returns_seeded_catalog` cubriendo GET `/api/v1/departments` (200, listado incluye `Sin asignar` con `is_system=true`, counts de empleados/equipos correctos para Admin).
- [ ] T027 [P] [US1] Test contract en `backend/tests/test_departments_router.py::test_create_department_admin_only` cubriendo POST exitoso (201), 403 para Moderador/Empleado, 409 por nombre duplicado (case-insensitive), 422 por color inválido y por icono fuera de catálogo.
- [ ] T028 [P] [US1] Test unitario en `backend/tests/test_department_service.py::test_create_department_emits_audit_log` verificando que el service crea el registro y emite `department.created`.
- [ ] T029 [P] [US1] Test de integración en `backend/tests/test_employee_service.py::test_employee_create_uses_department_id` para asegurar que el reemplazo string→FK quedó sano (no rompe alta de empleados, response trae el objeto anidado).

### Backend — endpoints CRUD (alta + listado)

- [ ] T030 [US1] Implementar `DepartmentService.create(payload, tenant_id)` en `backend/app/services/department_service.py`: validar unicidad case-insensitive, aplicar defaults de color/icono, persistir, emitir audit log `department.created`. Depende de T008.
- [ ] T031 [US1] Crear router `backend/app/routers/departments.py` con `GET /api/v1/departments` (cualquier autenticado) y `POST /api/v1/departments` (`AdminOnly`). Incluir counts en response solo para Admin. Depende de T030.
- [ ] T032 [US1] Registrar el router nuevo en `backend/app/main.py` (incluir `app.include_router(departments.router, prefix="/api/v1")`).

### Frontend — vista admin + integración en selectores

- [ ] T033 [P] [US1] Crear `frontend/src/views/DepartmentListView.tsx` (vista admin-only): grid de cards basado en el patrón de `EmployeeListView.tsx`, mostrando nombre, descripción, badge "Sistema" cuando aplica, color, icono Lucide, counts; barra superior con botón **+ Nuevo departamento**.
- [ ] T034 [P] [US1] Implementar el modal de creación dentro de `DepartmentListView.tsx` reusando `Modal`/`Button` (`frontend/src/components/ui/`), con form-control DaisyUI v5 (`flex flex-col gap-1`), color picker simple y selector de icono (catálogo). Al guardar invoca `departmentService.createDepartment` y `refresh()` del hook.
- [ ] T035 [US1] Agregar la ruta `/admin/departments` en `frontend/src/App.tsx` con guard de rol Admin y la entrada al sidebar en `frontend/src/components/layout/Sidebar.tsx` (visible solo a Admin). Si el archivo del sidebar tiene otro nombre, ajustar según `frontend/src/components/layout/*`.
- [ ] T036 [US1] Modificar `frontend/src/views/EmployeeListView.tsx`: reemplazar el `select` con la constante `DEPARTMENTS` por uno alimentado desde `useDepartments()` (solo activos), mostrando icono + nombre. Ajustar el payload de alta/edición para enviar `department_id`.
- [ ] T037 [P] [US1] Smoke test frontend en `frontend/src/views/DepartmentListView.test.tsx` (Vitest + RTL) cubriendo: render del listado con datos mock, click en "+ Nuevo departamento" abre modal, submit llama al service.

**Checkpoint**: el Admin puede crear departamentos y verlos en uso en empleados. Cumple FR-001 a FR-003, FR-006, FR-007, FR-008, FR-009, FR-016, FR-017 (alta), FR-018 (create), FR-019.

---

## Phase 4: User Story 2 — Admin edita un departamento existente (Priority: P2)

**Goal**: el Admin puede modificar nombre, descripción, color, icono y estado activo/inactivo de cualquier departamento no-sistema. Los cambios se propagan automáticamente a todos los empleados/equipos asignados. Los inactivos desaparecen de los selectores pero siguen presentes en históricos y en el ABM (filtrable).

**Independent Test**: validar quickstart §3 pasos 8-9 (Admin edita "Cocina" → cambia color → empleados asignados muestran el color nuevo; desactiva "Barra" → desaparece del dropdown de Empleados; toggle "Mostrar inactivos" lo vuelve a mostrar).

### Tests for User Story 2

- [ ] T038 [P] [US2] Test contract en `backend/tests/test_departments_router.py::test_update_department_rejects_system` cubriendo PUT 200 OK no-sistema, 403 con `code=department.system_protected` cuando `is_system=true`, 409 al renombrar a un nombre duplicado, 404 cuando el id es de otro tenant.
- [ ] T039 [P] [US2] Test unitario en `backend/tests/test_department_service.py::test_update_emits_correct_audit_action` verificando que `is_active=true→false` emite `department.deactivated`, `is_active=false→true` emite `department.activated`, otros cambios emiten `department.updated`.
- [ ] T040 [P] [US2] Test de integración en `backend/tests/test_employee_service.py::test_inactive_department_blocks_assignment` para asegurar que `EmployeeCreate`/`EmployeeUpdate` rechazan `department_id` inactivo.

### Backend — endpoint PUT y validaciones

- [ ] T041 [US2] Implementar `DepartmentService.update(department_id, payload, tenant_id)` en `backend/app/services/department_service.py`: rechazar si `is_system=true`, validar unicidad case-insensitive (excluyendo el propio id), aplicar partial update, detectar transición de `is_active` para elegir el evento de audit log adecuado (`department.updated`/`activated`/`deactivated`). Depende de T030.
- [ ] T042 [US2] Agregar `PUT /api/v1/departments/{id}` (`AdminOnly`) y `GET /api/v1/departments/{id}` (cualquier autenticado) en `backend/app/routers/departments.py`. Depende de T041.
- [ ] T043 [US2] Ajustar `employee_service` y `team_service` para rechazar `department_id` cuyo `is_active=false` en alta y edición (mantener el ya asignado en históricos). Depende de T015, T016, T041.

### Frontend — edición + filtros

- [ ] T044 [US2] Extender `frontend/src/views/DepartmentListView.tsx` con modal de edición reutilizando el modal de creación: pre-llena campos, deshabilita controles si `isSystem`, ofrece toggle "Activo/Inactivo" como un switch DaisyUI v5. Al guardar invoca `departmentService.updateDepartment` y `refresh()`.
- [ ] T045 [US2] Agregar a `DepartmentListView.tsx` un control "Mostrar inactivos" (checkbox/switch) que setea `includeInactive=true` en la llamada al service y aplica un badge "Inactivo" en las cards correspondientes.
- [ ] T046 [US2] Actualizar `useDepartments` para soportar `refresh({ includeInactive })` y que el contexto cachee dos listados (activos para selectores; todos para ABM). Alternativa equivalente: dos hooks (`useActiveDepartments`, `useAllDepartments`) — documentar la elección en código.
- [ ] T047 [US2] Asegurar que `EmployeeListView.tsx` y demás vistas que consumen `useDepartments` filtran a `is_active=true` para sus selectores y filtros (mientras siguen mostrando "Sin asignar").

**Checkpoint**: el Admin puede mantener el catálogo limpio sin perder historial. Cumple FR-004, FR-014, FR-015, FR-016, FR-018 (update/activated/deactivated).

---

## Phase 5: User Story 3 — Admin elimina un departamento con reasignación segura (Priority: P3)

**Goal**: el Admin puede eliminar un departamento; antes de confirmar ve el conteo exacto de empleados y equipos que serán reasignados a "Sin asignar"; la operación es atómica (rollback total si algo falla) y el departamento "Sin asignar" está protegido contra borrado.

**Independent Test**: validar quickstart §2 pasos 2.5-2.10 + §3 pasos 5-10 (Admin asigna empleados a un depto, borra, modal muestra conteo, confirma, empleados aparecen en "Sin asignar"; intentar borrar "Sin asignar" devuelve 403).

### Tests for User Story 3

- [ ] T048 [P] [US3] Test contract en `backend/tests/test_departments_router.py::test_delete_preview_counts` cubriendo GET `/api/v1/departments/{id}/delete-preview` (200 con counts esperados, 403 si `is_system=true`, 404 si id de otro tenant).
- [ ] T049 [P] [US3] Test contract en `backend/tests/test_departments_router.py::test_delete_reassigns_and_blocks_system` cubriendo: DELETE no-sistema reasigna a "Sin asignar" y responde con counts; DELETE sobre `is_system=true` retorna 403 `department.system_protected`; intento por Moderador retorna 403.
- [ ] T050 [P] [US3] Test unitario en `backend/tests/test_department_service.py::test_delete_with_reassign_is_atomic` (usar transacción simulada: forzar fallo entre el UPDATE de employees y el de teams, verificar rollback completo y que ni el depto ni los FKs cambiaron).
- [ ] T051 [P] [US3] Test unitario en `backend/tests/test_department_service.py::test_ensure_system_department_idempotent` (llamarlo dos veces, verificar que solo existe un "Sin asignar" por tenant).

### Backend — delete-preview, delete con reasignación, audit log

- [ ] T052 [US3] Implementar `DepartmentService.get_delete_preview(department_id, tenant_id)` en `backend/app/services/department_service.py` devolviendo el target (`ensure_system_department`) y counts (`SELECT COUNT(*)` por `department_id`). Rechazar `is_system=true`. Depende de T008.
- [ ] T053 [US3] Implementar `DepartmentService.delete_with_reassign(department_id, tenant_id)` en una única transacción: resolver target con `ensure_system_department`, `UPDATE` de `employees` y `teams`, `is_active=False` del depto, audit log `department.deleted` con counts. Rechazar `is_system=true`. Depende de T052.
- [ ] T054 [US3] Agregar endpoints `GET /api/v1/departments/{id}/delete-preview` y `DELETE /api/v1/departments/{id}` (`AdminOnly`) en `backend/app/routers/departments.py`. Mapear `ConflictError`/`ForbiddenError`/`NotFoundError` a los códigos del contrato. Depende de T053.

### Frontend — modal de confirmación + UX

- [ ] T055 [US3] Extender `frontend/src/views/DepartmentListView.tsx` con flujo de eliminación: al click en "Eliminar" (deshabilitado y con tooltip si `isSystem`), llama `departmentService.getDeletePreview(id)`, abre un `Modal` reusable con el texto exacto del contrato (variantes con counts > 0 y = 0). Botón "Eliminar" en variant danger.
- [ ] T056 [US3] Al confirmar el modal, invocar `departmentService.deleteDepartment(id)`, mostrar `Toast` (`frontend/src/components/ui/Toast.tsx`) con resumen `Departamento eliminado. N empleados y M equipos movidos a "Sin asignar".`, hacer `refresh()` del hook y cerrar el modal. En error, mostrar toast `error` sin cerrar el modal.
- [ ] T057 [P] [US3] Smoke test frontend en `frontend/src/views/DepartmentListView.test.tsx::deleteFlow` cubriendo: mock del preview retornando counts, click en eliminar abre modal con texto correcto, confirmar llama al service y dispara refresh.

**Checkpoint**: el ABM queda completo. Cumple FR-005, FR-010 a FR-013, FR-018 (deleted), preserva FR-019 vía soft-delete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: cierre de calidad, documentación y validación end-to-end.

- [ ] T058 [P] Ejecutar `cd backend && mypy app --strict` y resolver cualquier error introducido por la migración a FK.
- [ ] T059 [P] Ejecutar `cd backend && ruff check . --fix` y `pytest -k department` + `pytest` (suite completa) hasta verde.
- [ ] T060 [P] Ejecutar `cd frontend && npm run lint && npm run build`. Resolver errores antes de commitear.
- [ ] T061 Ejecutar el quickstart manual completo (`specs/014-department-abm/quickstart.md` §2 y §3) levantando `docker-compose up -d` y validando los flujos de las tres US contra el stack real. Documentar capturas o evidencias si el equipo lo solicita.
- [ ] T062 Revisar `specs/014-department-abm/checklists/requirements.md` y marcar checklist final completo. Si surge alguna inconsistencia en la implementación, abrir un seguimiento dentro del checklist.
- [ ] T063 Hacer commit conventional ("feat: ABM de departamentos con reasignación a Sin asignar (#014)") y `git push -u origin feature/department-abm`. **No** abrir PR salvo que el usuario lo pida explícitamente.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup. **Bloquea** todas las US.
- **US1 / US2 / US3 (Phase 3-5)**: dependen de Foundational completa. Tras ese punto pueden trabajarse en paralelo por personas distintas, **pero** en secuencia natural P1 → P2 → P3 si hay un solo desarrollador (cada US agrega contrato sobre el anterior service).
- **Polish (Phase 6)**: depende de las US que se quieran cerrar para el release.

### User Story Dependencies

- **US1 (P1) — MVP**: arranca cuando T004-T025 cierran. Solo agrega endpoints de listado + alta; el resto del sistema ya funciona porque la migración (T009) ya consolidó los FKs.
- **US2 (P2)**: independiente de US1 en código (toca métodos distintos del service y modal de edición distinto), pero comparte el service y el router; coordinar merges de `department_service.py` y `routers/departments.py`.
- **US3 (P3)**: independiente de US2; reusa el service base + `ensure_system_department`. Si US3 se hace antes que US2, igual queda funcional.

### Within Each User Story

- Tests primero (siguiendo la disciplina TDD que el constitution gate sugiere).
- Service antes que router.
- Router antes que la vista frontend que lo consume.
- Vista frontend antes que los tests UI.

### Parallel Opportunities

- T002, T003 en Phase 1 (chequeos independientes).
- T004-T007, T011-T014, T022-T024 en Phase 2 (archivos distintos sin dependencias mutuas).
- T026-T029, T038-T040, T048-T051 (los tests dentro de cada US son [P]).
- US1/US2/US3 enteras pueden paralelizarse entre desarrolladores tras Foundational.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 corren en paralelo (archivos distintos / tests independientes):
Task: "Contract test list en backend/tests/test_departments_router.py"
Task: "Contract test create en backend/tests/test_departments_router.py" # mismo file pero tests independientes; equivalente a -k name
Task: "Service test create+audit en backend/tests/test_department_service.py"
Task: "Integration test employee FK en backend/tests/test_employee_service.py"

# Vista y service pueden avanzar en paralelo tras T030:
Task: "POST /api/v1/departments en backend/app/routers/departments.py"
Task: "DepartmentListView.tsx en frontend/src/views/DepartmentListView.tsx"
```

---

## Implementation Strategy

### MVP First (US1 únicamente)

1. Phase 1 (Setup) — chequeos.
2. Phase 2 (Foundational) — migración, FK, hook frontend.
3. Phase 3 (US1) — listado + alta + dropdown dinámico.
4. **STOP & VALIDATE**: ejecutar quickstart §3 pasos 1-4. Si pasa, ya hay MVP funcional (el admin puede crear departamentos nuevos, que era el dolor principal).
5. Deploy/demo.

### Incremental Delivery

- MVP (US1) → demo → seguir con US2 (edición + estado) → demo → cerrar con US3 (borrado seguro).
- Cada incremento es un commit/PR independiente si se quiere.

### Parallel Team Strategy

Con varios desarrolladores tras Foundational:

- Dev A: US1 (router + DepartmentListView).
- Dev B: US2 (PUT + edición).
- Dev C: US3 (delete-preview + DELETE + modal de confirmación).
- Coordinar merges sobre `department_service.py` y `routers/departments.py` para evitar conflictos.

---

## Notes

- **[P]** = archivos distintos y sin dependencia bloqueante.
- **[US-all]** marca tareas de Foundational que las tres US consumen (no son [P] con sus dependientes pero sí con sus pares de la misma fase).
- Cada US es independientemente entregable; si la P3 se difiere, US1+US2 dejan un producto coherente (el Admin pueden gestionar el catálogo, simplemente desactivando lo que no usa).
- **Cero** dependencias nuevas: la feature reutiliza Axios, DaisyUI v5, Lucide React, SQLModel, Alembic y todo el resto del stack existente.
- **Audit log** se emite siempre **dentro del service**, no en el router (Clean Architecture).
- Recordatorio del constitution gate: `mypy --strict`, `ruff`, `pytest`, `npm run lint`, `npm run build` deben quedar verdes antes del commit (T058-T060).
