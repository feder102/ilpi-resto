# Feature Specification: Carga masiva de turnos

**Feature Branch**: `011-bulk-shift-loading`
**Created**: 2026-06-17
**Status**: Implemented
**Input**: User description: "Carga masiva de turnos por empleados, donde en la configuración te indique si cargarlo todos los días incluyendo los fines de semana o solo los días laborales. Esto deberá ser posible desde la vista de calendario de turnos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carga masiva de turnos a varios empleados (Priority: P1)

Un Admin o Moderador necesita planificar turnos para uno o varios empleados a lo
largo de un rango de fechas sin tener que crear cada turno día por día. Desde la
vista de calendario de turnos abre el diálogo de "Carga masiva", selecciona los
empleados, un tipo de turno, un rango de fechas, e indica si los turnos se cargan
**todos los días (incluyendo fines de semana)** o **solo días laborales (Lun-Vie)**.
El sistema crea todos los turnos correspondientes en una sola operación.

**Why this priority**: Es el núcleo de la feature; entrega valor inmediato al
reducir drásticamente el tiempo de planificación. Sin esto, no hay carga masiva.

**Independent Test**: Como Admin, abrir "Carga masiva", seleccionar 2 empleados,
un tipo de turno y un rango de una semana con "Todos los días"; verificar que se
crean 7 turnos por empleado y que el calendario los muestra.

**Acceptance Scenarios**:

1. **Given** un Admin en la vista de calendario de turnos, **When** selecciona 2
   empleados, un tipo de turno y el rango Lun-Vie con "Todos los días", **Then** el
   sistema crea 5 turnos por empleado (10 en total) y el calendario se actualiza.
2. **Given** el mismo formulario, **When** elige "Solo días laborales (Lun-Vie)"
   sobre un rango que incluye sábado y domingo, **Then** no se crean turnos para
   sábado ni domingo.
3. **Given** un rango con fecha de inicio posterior a la fecha de fin, **When**
   intenta enviar, **Then** el sistema rechaza la operación con un mensaje claro.
4. **Given** ningún empleado seleccionado, **When** intenta enviar, **Then** el
   botón está deshabilitado / se muestra un error de validación.

---

### User Story 2 - Omitir y reportar conflictos (Priority: P2)

Durante la carga masiva, algunos días pueden estar en conflicto: el empleado ya
tiene un turno asignado ese día, tiene vacaciones aprobadas, o la fecha está en el
pasado. El sistema crea los turnos posibles, omite los días en conflicto y muestra
un resumen con la cantidad de turnos creados y la lista de días omitidos con su
motivo.

**Why this priority**: Hace la operación robusta y predecible; evita fallos
totales por un solo conflicto y da transparencia al planificador.

**Independent Test**: Crear una vacación aprobada de un día para un empleado dentro
del rango; ejecutar la carga masiva; verificar que ese día aparece en "omitidos"
con motivo "Vacaciones aprobadas" y el resto se crea.

**Acceptance Scenarios**:

1. **Given** un empleado con un turno ya existente en un día del rango, **When** se
   ejecuta la carga masiva, **Then** ese día se omite con motivo "Turno ya
   existente" y los demás días se crean.
2. **Given** un empleado con vacaciones aprobadas en un día del rango, **When** se
   ejecuta la carga masiva, **Then** ese día se omite con motivo "Vacaciones
   aprobadas".
3. **Given** un rango que incluye días pasados y futuros, **When** se ejecuta,
   **Then** los días pasados se omiten con motivo "Fecha en el pasado" y los futuros
   se crean.
4. **Given** una operación completada, **When** el sistema responde, **Then** el
   diálogo muestra `created_count`, `skipped_count` y una tabla de omitidos.

---

### User Story 3 - Restricción por rol (Priority: P3)

Un Empleado no debe poder ejecutar cargas masivas. La acción solo está disponible
para Admin y Moderador, tanto en la interfaz como en el backend.

**Why this priority**: Cumple el principio de seguridad RBAC; importante pero
depende de las historias anteriores para tener sentido.

**Independent Test**: Iniciar sesión como Empleado y verificar que el botón "Carga
masiva" no aparece; llamar al endpoint directamente y recibir 403.

**Acceptance Scenarios**:

1. **Given** un usuario con rol Empleado, **When** entra a la vista de calendario,
   **Then** no ve el botón "Carga masiva".
2. **Given** un usuario con rol Empleado, **When** llama a `POST
   /rosters/shifts/bulk`, **Then** recibe `403 Forbidden`.
3. **Given** una petición sin autenticar, **When** llama al endpoint, **Then**
   recibe `401 Unauthorized`.

### Edge Cases

- ¿Qué pasa si un empleado seleccionado está inactivo o no existe? → Se omite y se
  reporta con motivo "Empleado no encontrado o inactivo".
- ¿Qué pasa si todo el rango está en conflicto? → `created_count = 0` y todos los
  días aparecen en `skipped`.
- ¿Qué pasa con un rango de un solo día? → Se crea un turno por empleado (si no hay
  conflicto).
- ¿El tipo de turno está inactivo o no existe? → La operación se rechaza con error
  de validación (no se crea nada).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST permitir a Admin/Moderador asignar un tipo de turno a
  uno o más empleados sobre un rango de fechas en una sola operación.
- **FR-002**: El sistema MUST ofrecer una opción para incluir todos los días o solo
  los días laborales (Lunes a Viernes) en el rango.
- **FR-003**: La acción MUST estar disponible desde la vista de calendario de
  turnos (`ShiftRosterCalendar`).
- **FR-004**: El sistema MUST validar que la fecha de inicio sea anterior o igual a
  la fecha de fin, y que el rango no esté íntegramente en el pasado.
- **FR-005**: El sistema MUST requerir al menos un empleado y un tipo de turno
  válido y activo.
- **FR-006**: El sistema MUST omitir (no abortar) los días en conflicto —turno
  existente, vacaciones aprobadas, fecha pasada, empleado inválido— y reportarlos
  con su motivo.
- **FR-007**: El sistema MUST reutilizar las reglas de conflicto existentes de la
  asignación individual (`create_shift`): unicidad por (tenant, empleado, fecha) y
  solapamiento con vacaciones aprobadas.
- **FR-008**: El sistema MUST devolver un resumen con la lista de turnos creados, la
  lista de días omitidos y los contadores `created_count` / `skipped_count`.
- **FR-009**: El sistema MUST aplicar RBAC en la capa de servicio y restringir el
  endpoint a Admin/Moderador.
- **FR-010**: El sistema MUST aislar todas las consultas por `tenant_id` del JWT.
- **FR-011**: El sistema MUST registrar un evento de auditoría
  (`SHIFT_BULK_CREATE`) de la operación masiva.
- **FR-012**: Tras una carga exitosa, la vista de calendario MUST refrescar los
  turnos del mes mostrado.

### Key Entities *(include if feature involves data)*

- **ShiftRecord** (reutilizado, sin cambios de esquema): registro de turno asignado
  por (tenant_id, employee_id, date, shift_type_id, created_by).
- **ShiftType** (reutilizado): tipo de turno predefinido; debe estar activo.
- **VacationRequest** (reutilizado): se consulta para detectar conflictos de
  vacaciones aprobadas.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un planificador puede asignar un turno a 5 empleados durante una
  semana en menos de 1 minuto y en una sola operación.
- **SC-002**: El 100% de los días en conflicto se omiten y se reportan con su
  motivo, sin impedir la creación de los días válidos.
- **SC-003**: Un Empleado nunca puede ejecutar la carga masiva (0% de éxito vía UI
  o API directa).
- **SC-004**: Tras la carga, el calendario refleja los nuevos turnos sin requerir
  recarga manual de la página.

## Assumptions

- "Días laborales" = Lunes a Viernes. No se consideran festivos (el sistema no
  modela festivos hoy).
- La preferencia de incluir/excluir fines de semana se elige en cada operación
  (no se persiste como ajuste del tenant).
- El conteo de días es por días naturales del rango (inclusive inicio y fin).
