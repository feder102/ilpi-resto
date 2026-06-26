# Feature Specification: Procesamiento mensual de días trabajados

**Feature Branch**: `claude/monthly-workday-processing-sqepux`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Crear una feature en donde te permita seleccionar un mes y hacer clic en un botón en donde se procesen todos los días trabajados de un mes de todos los empleados. Si algo se hizo alguna vez o se procesó, no debería duplicar la entrada, sino simplemente skipearla o dismissearla, pero si encontró un día nuevo que trabajó el empleado, obviamente que agregarla."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Procesar un mes completo con un clic (Priority: P1)

Un Admin o Moderador entra al panel de Estadísticas, selecciona un mes (año + mes) y pulsa "Procesar mes". El sistema recorre todas las fechas del mes hasta el día de hoy y genera las `TimeEntry` (días trabajados) que falten a partir de los turnos asignados (`ShiftRecord`). Al finalizar, muestra un resumen con cuántas entradas se crearon, cuántas ya existían y cuántos días no tenían turnos asignados.

**Why this priority**: Es el caso central del feature y reemplaza la operativa actual de procesar día por día (30 clics para consolidar un mes). Sin esta historia el feature no tiene sentido.

**Independent Test**: Crear 5 `ShiftRecord` distribuidos en 3 fechas distintas de mayo 2026. Iniciar sesión como Admin, ir a *Estadísticas → Procesamiento por Lotes*, seleccionar mayo 2026, pulsar "Procesar mes". Verificar que el resumen indica 5 entradas creadas. Consultar la BD o el listado de TimeEntry y confirmar que existen las 5 entries con `shift_date` correcto.

**Acceptance Scenarios**:

1. **Given** un Admin autenticado y 12 `ShiftRecord` repartidos en 8 días de marzo 2026 sin TimeEntry previos, **When** selecciona marzo 2026 y pulsa "Procesar mes", **Then** el sistema crea 12 `TimeEntry` y devuelve un resumen `entries_created=12, entries_skipped=0`.
2. **Given** un Moderador autenticado, **When** ejecuta el procesamiento mensual, **Then** el sistema responde 200 OK (consistente con el resto de endpoints `/admin/time-tracking/*`).
3. **Given** un Empleado autenticado, **When** llama directamente al endpoint, **Then** el sistema responde 403 Forbidden.
4. **Given** un mes seleccionado en el futuro (julio 2026 cuando hoy es 25-jun-2026), **When** se pulsa "Procesar mes", **Then** el sistema responde `days_processed=0, entries_created=0` sin error.

---

### User Story 2 - Idempotencia: no duplicar lo ya procesado (Priority: P1)

Cuando un mes ya fue procesado (total o parcialmente), reprocesarlo no debe duplicar `TimeEntry`. Las fechas que ya tienen entradas para los turnos correspondientes se omiten silenciosamente y se contabilizan en `entries_skipped`. Solo las fechas con turnos sin entrada generan nuevas filas.

**Why this priority**: Es la garantía que el usuario pidió explícitamente ("Si algo se hizo alguna vez o se procesó, no debería duplicar la entrada"). Sin ella, ejecutar el botón dos veces corromperá las estadísticas y violará el `UniqueConstraint` de `TimeEntry`.

**Independent Test**: Ejecutar la US1, anotar los conteos. Pulsar "Procesar mes" otra vez sobre el mismo mes. Verificar que el resumen indica `entries_created=0` y `entries_skipped=N` (siendo N el número total de turnos del mes). Verificar en BD que el número de filas en `time_entries` no aumentó.

**Acceptance Scenarios**:

1. **Given** un mes ya procesado completamente (todos los turnos tienen TimeEntry), **When** un Admin vuelve a pulsar "Procesar mes", **Then** el sistema responde `entries_created=0, entries_skipped=<total_turnos>` y la tabla `time_entries` no crece.
2. **Given** un mes parcialmente procesado (algunos turnos tienen TimeEntry, otros no), **When** se ejecuta el procesamiento, **Then** el sistema crea solo las entries faltantes y reporta los conteos exactos de creadas vs omitidas.
3. **Given** un nuevo `ShiftRecord` agregado retroactivamente a una fecha de un mes ya procesado, **When** se reprocesa el mes, **Then** el sistema genera la TimeEntry faltante para ese turno (`entries_created=1`) y omite el resto.

---

### User Story 3 - Manejo de fechas sin turnos y errores parciales (Priority: P2)

El procesamiento mensual debe ser resiliente: una fecha sin turnos asignados no es un error sino un dato (contabilizado en `days_without_shifts`), y un fallo puntual en un día no debe abortar el procesamiento del resto del mes. Los días con error se devuelven en una lista para diagnóstico.

**Why this priority**: Garantiza que un mes con días variados (festivos, fines de semana sin servicio, errores de datos puntuales) se procese de forma útil. Es P2 porque las US1/US2 cubren el camino feliz; esta historia endurece el feature.

**Independent Test**: Crear turnos solo en 10 de los 30 días del mes. Procesar el mes. Verificar que el resumen indica `days_processed=25` (si hoy es día 25), `entries_created=N` y `days_without_shifts=15` (los días sin turnos hasta hoy).

**Acceptance Scenarios**:

1. **Given** un mes en el que solo 10 días tienen turnos asignados, **When** se procesa el mes pasado completo (28-31 días), **Then** el sistema reporta `days_without_shifts = <días_sin_turnos>` y no aborta.
2. **Given** un día con datos corruptos (ej. shift_type con `time_windows` inválido), **When** se procesa el mes, **Then** el sistema continúa con el resto del mes y reporta ese día en `errors[]` con un mensaje descriptivo.
3. **Given** un mes futuro o un mes sin ningún turno, **When** se procesa, **Then** el sistema responde sin error con `entries_created=0` y `days_without_shifts=<total_días>`.

---

### Edge Cases

- **Mes actual con días futuros**: si se selecciona el mes en curso, el sistema solo itera hasta el día de hoy inclusive. Los días futuros no se procesan ni se cuentan en `days_processed`.
- **Empleado con ausencia registrada**: si el empleado tiene un `Absence` en una fecha, su `ShiftRecord` de esa fecha se omite (lógica ya implementada en `generate_time_entries_for_date`).
- **Concurrencia**: dos Admins ejecutan el procesamiento del mismo mes en paralelo. El `UniqueConstraint` de `TimeEntry` garantiza que no se creen duplicados; uno de los dos transaccionalmente verá `entries_skipped` más alto.
- **Año/mes fuera de rango**: el sistema rechaza con 422 si `year < 2020 | year > 2100 | month < 1 | month > 12`.
- **Tenant aislado**: el procesamiento solo afecta a turnos del `tenant_id` del usuario autenticado.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST exponer un endpoint `POST /admin/time-tracking/process-month` accesible solo para roles Admin y Moderador.
- **FR-002**: El endpoint MUST recibir `year` (2020-2100) y `month` (1-12) y validar el rango con error 422 si está fuera.
- **FR-003**: El sistema MUST iterar desde el día 1 del mes hasta `min(último_día_del_mes, hoy)` inclusive, llamando al generador de TimeEntry existente por cada fecha.
- **FR-004**: El sistema MUST omitir cualquier turno cuyo `(employee_id, shift_date, shift_type_id)` ya tenga una `TimeEntry` en la tabla, sin lanzar error.
- **FR-005**: El sistema MUST devolver un resumen agregado con: `year`, `month`, `days_processed`, `entries_created`, `entries_skipped`, `days_without_shifts`, `errors[]`.
- **FR-006**: Un error en una fecha individual MUST NOT abortar el procesamiento del resto del mes; el día fallido se reporta en `errors[]`.
- **FR-007**: La vista de UI MUST permitir seleccionar año y mes y pulsar un botón "Procesar mes" con estado `loading` mientras la petición está en curso.
- **FR-008**: La vista de UI MUST mostrar el resumen del resultado en español al finalizar (éxito o error).
- **FR-009**: El sistema MUST registrar en el log estructurado el inicio y fin del procesamiento mensual con `tenant_id`, `user_id`, `year`, `month` y los conteos del resumen.

### Key Entities

- **TimeEntry** *(reutilizada, sin cambios)*: la tabla `time_entries` ya existe (`backend/app/models/time_entry.py`) con `UniqueConstraint(tenant_id, employee_id, shift_date, shift_type_id)` que garantiza la idempotencia.
- **ShiftRecord** *(reutilizada, sin cambios)*: la tabla `shift_record` aporta los turnos asignados que se convierten en TimeEntry.

**No se introducen entidades nuevas.**

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Admin puede consolidar un mes de 30 días en **< 5 segundos** (medidos contra una BD con ≤500 turnos en ese mes).
- **SC-002**: Ejecutar el botón dos veces seguidas sobre el mismo mes NO incrementa el conteo de filas en `time_entries` (idempotencia verificable por query).
- **SC-003**: El tiempo de operación humana para procesar un mes baja de ~30 clics (uno por día) a **1 clic**.
- **SC-004**: El feature NO requiere migración Alembic (verificable por `alembic heads` antes y después).
- **SC-005**: Los tests automatizados cubren los 3 escenarios principales (US1, US2, US3) y el caso de RBAC (US1 #3).
