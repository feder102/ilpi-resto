# Implementation Plan: ABM de Departamentos

**Branch**: `feature/department-abm` (numeración interna: `014-department-abm`) | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/014-department-abm/spec.md`

## Summary

Reemplazar el manejo string-libre de `Employee.department` y `Team.department` por un catálogo de departamentos administrable desde una sección ABM exclusiva del rol **Admin**. El catálogo persiste en una nueva tabla `departments` (FK desde `employees` y `teams`), con un departamento sistema **"Sin asignar"** (`is_system=True`) que actúa como destino de fallback al eliminar. La eliminación pasa por un endpoint de **preview** que devuelve los conteos de empleados y equipos afectados; el frontend usa esos conteos para mostrar un modal de confirmación antes de ejecutar el borrado, que se hace en una transacción atómica (reasignar a "Sin asignar" + soft-delete del departamento). La feature incluye migración Alembic con backfill por nombre, audit log de todas las operaciones, y exposición de la lista a Moderador/Empleado en modo solo lectura para alimentar selectores y filtros existentes.

## Technical Context

**Language/Version**: Python 3.12 (backend) + TypeScript 5.8+ (frontend)
**Primary Dependencies**: FastAPI, SQLModel, Alembic, Pydantic v2 (backend) · React 19, react-router-dom v7, Tailwind CSS v4 + DaisyUI v5, Axios, Lucide React (frontend)
**Storage**: PostgreSQL 16 (nueva tabla `departments`; alteraciones a `employees` y `teams`)
**Testing**: pytest + httpx (backend) · Vitest + React Testing Library (frontend); mypy --strict + ruff + ESLint como gates
**Target Platform**: Linux container (Docker Compose en desarrollo, despliegue containerizado en producción)
**Project Type**: Web application (backend FastAPI + frontend SPA)
**Performance Goals**: Borrado de departamento con hasta 500 empleados y 50 equipos en < 5 s (SC-002); listado de departamentos < 200 ms p95 con catálogo de hasta ~50 entradas por tenant
**Constraints**: Multi-tenant aware (todo query filtrado por `tenant_id`); RBAC enforced en service layer; mypy --strict zero errors; soft-delete para preservar trazabilidad histórica; backfill de migración debe preservar 100 % de asignaciones existentes (SC-006)
**Scale/Scope**: Decenas de departamentos por tenant, cientos a algunos miles de empleados por tenant en horizonte MVP; un solo tenant en producción inicial pero modelo preparado para multi-tenant

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Estado | Justificación |
|---|---|---|
| **I. Clean Architecture** | ✅ PASS | Dependencias `routers → services → models`. Router solo serialización + RBAC; service contiene reasignación atómica y validaciones; modelo es entidad pura. |
| **II. Strict Modularity** | ✅ PASS | Un módulo nuevo (`department`) con responsabilidad única (gestión del catálogo). Reuso de `common/exceptions.py`, `dependencies.py`, `audit_logger`. DAG limpio. |
| **III. Strict Type Safety** | ✅ PASS | Modelos SQLModel + esquemas Pydantic v2 tipados. Frontend TS strict, interfaces para Department. Cero `Any` sin justificar. |
| **IV. Production-Ready** | ✅ PASS | Migración Alembic reversible (upgrade/downgrade), seed automático del depto sistema, logging JSON, sin secretos hardcoded. |
| **V. Security-First** | ✅ PASS | RBAC AdminOnly enforced en service layer (no solo router); inputs validados por Pydantic; queries vía ORM; audit log de cada operación con actor + target + counts. |
| **VI. Structured Error Handling** | ✅ PASS | Reuso de excepciones de dominio (`ConflictError`, `NotFoundError`, `ForbiddenError`) ya existentes. Errores de validación de Pydantic devuelven schema consistente. |

**Result**: PASS — no se requieren entradas en `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/014-department-abm/
├── plan.md                    # Este archivo (output de /speckit.plan)
├── spec.md                    # Especificación funcional (output de /speckit.specify)
├── research.md                # Phase 0: decisiones de diseño técnico
├── data-model.md              # Phase 1: entidades, FKs, índices, migración
├── quickstart.md              # Phase 1: cómo probar la feature end-to-end
├── contracts/
│   └── departments-api.md     # Phase 1: contrato HTTP de los nuevos endpoints
├── checklists/
│   └── requirements.md        # Validación de calidad del spec (/speckit.specify)
└── tasks.md                   # Phase 2: tareas dependency-ordered (/speckit.tasks — siguiente paso)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── models/
│   │   ├── department.py            # NUEVO  modelo SQLModel Department
│   │   ├── employee.py              # MOD    string department → department_id FK
│   │   ├── team.py                  # MOD    string department → department_id FK
│   │   └── __init__.py              # MOD    re-export Department para Alembic
│   ├── schemas/
│   │   ├── department.py            # NUEVO  DepartmentCreate/Update/Response/DeletePreview
│   │   ├── employee.py              # MOD    payload usa department_id; response anida {id,name,color,icon}
│   │   └── team.py                  # MOD    idem
│   ├── services/
│   │   ├── department_service.py    # NUEVO  CRUD + delete_with_reassign + ensure_system_department
│   │   ├── employee_service.py      # MOD    filtros por department_id; response incluye depto anidado
│   │   ├── team_service.py          # MOD    idem
│   │   └── moderator_service.py     # MOD    get_moderator_department devuelve depto completo
│   ├── routers/
│   │   ├── departments.py           # NUEVO  GET/POST/PUT/DELETE + /delete-preview
│   │   ├── employees.py             # MOD    filtros por department_id
│   │   ├── teams.py                 # MOD    idem
│   │   ├── dashboard.py             # MOD    agregaciones por department_id
│   │   ├── time_tracking.py         # MOD    estadísticas por department_id
│   │   ├── moderator.py             # MOD    scope por department_id
│   │   └── __init__.py / main.py    # MOD    registrar router departments
│   └── seed.py                      # MOD    crear depto sistema "Sin asignar" + 4 default por tenant
├── alembic/
│   └── versions/
│       └── <ts>_add_departments_table.py  # NUEVO  migración con backfill
└── tests/
    ├── test_department_service.py   # NUEVO  unit tests del service
    ├── test_departments_router.py   # NUEVO  contract tests del router (RBAC, validation, delete preview)
    └── test_employee_service.py     # MOD    actualizar asserts a department_id

frontend/
├── src/
│   ├── services/
│   │   └── departmentService.ts     # NUEVO  cliente HTTP Axios
│   ├── hooks/
│   │   └── useDepartments.ts        # NUEVO  hook con cache simple para selectores
│   ├── types/
│   │   └── models.ts                # MOD    interface Department; EmployeeResponse.department anidado
│   ├── config/
│   │   └── constants.ts             # MOD    eliminar DEPARTMENTS hardcoded; mantener icon catalog
│   ├── views/
│   │   ├── DepartmentListView.tsx   # NUEVO  vista ABM admin-only
│   │   └── EmployeeListView.tsx     # MOD    dropdown dinámico usando useDepartments
│   ├── components/
│   │   └── layout/Sidebar.tsx       # MOD    nueva entrada "Departamentos" (solo Admin)
│   └── App.tsx                      # MOD    ruta /admin/departments protegida por rol Admin
└── tests/
    └── views/DepartmentListView.test.tsx  # NUEVO  smoke tests UI
```

**Structure Decision**: Web application (backend FastAPI + frontend SPA en monorepo). Sigue el patrón existente para todas las features (CRUD de Empleado, Vacaciones, Shifts, etc.). El módulo Department se inserta sin cambios estructurales: nuevos archivos en sus carpetas correspondientes, modificaciones puntuales sobre los archivos que referencian el campo string `department`.

## Phase 0 – Research

Ver [`research.md`](./research.md). Decisiones tomadas:

1. **Modelo FK vs string-con-tabla**: FK fuerte (`department_id UUID NOT NULL`) en Employee y Team. Justificado por Clean Architecture, integridad referencial y renombre barato.
2. **Identidad de "Sin asignar"**: nombre + flag `is_system=True` por tenant. Se resuelve por flag, no por nombre, para tolerar i18n futuro.
3. **Estrategia de borrado**: soft-delete del departamento (`is_active=False`) + reasignación atómica de FK. Endpoint `GET /delete-preview` precede al `DELETE` para alimentar el modal de confirmación.
4. **Migración con backfill**: alembic en 3 pasos — crear tabla y seed inicial; agregar columna FK nullable + backfill por nombre; volver NOT NULL y dropear columna string.
5. **Catálogo de iconos**: subset curado de Lucide React mantenido en `frontend/src/config/constants.ts` (`DEPARTMENT_ICON_CATALOG`); el backend solo valida que el icon name está en una lista permitida vía Pydantic enum.
6. **Cache frontend**: hook `useDepartments` con `useEffect` + `useContext` para compartir el listado entre vistas. Invalidación manual tras create/update/delete.
7. **Audit log**: reuso del `security_logger` existente con acciones `department.created`, `department.updated`, `department.activated`, `department.deactivated`, `department.deleted` (esta última incluye counts).

Sin entradas `NEEDS CLARIFICATION`.

## Phase 1 – Design

Ver:

- [`data-model.md`](./data-model.md) — entidades, FKs, índices, estados, plan de migración Alembic.
- [`contracts/departments-api.md`](./contracts/departments-api.md) — contrato HTTP de los nuevos endpoints + cambios en `employees`/`teams`.
- [`quickstart.md`](./quickstart.md) — recorrido end-to-end para validar la feature manualmente.

### Constitution Re-check post-design

Tras detallar entidades, contrato y migración, los seis principios siguen cumpliéndose sin desvíos:

- La transacción de borrado se ejecuta dentro del service (`department_service.delete_with_reassign`); el router solo orquesta HTTP. ✅ Clean Architecture.
- Audit log se emite en el service tras commit exitoso, con counts en el payload. ✅ Security-First + Production-Ready.
- Endpoint de preview es idempotente y read-only; no introduce side-effects ni rompe REST semantics. ✅ Modularity + Structured Errors.

**Result**: PASS — sin violaciones, `Complexity Tracking` queda vacío.

## Complexity Tracking

> No se requiere — todas las gates de la constitución pasan sin desvíos.
