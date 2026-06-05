# Feature Specification: Admin-Driven Shift Hours & Extra Hours (No Employee Clock-In)

**Feature Branch**: `010-admin-shift-time-tracking`
**Created**: 2026-06-05
**Status**: Draft
**Input**: User description: "Mejorar el flujo de marcación: el empleado ya no ingresa su hora de entrada/salida. El control de horas se hace mediante el turno que el administrador le carga, y ese turno indica las horas trabajadas. Quitarle al empleado la posibilidad de cargar su marcación; el empleado solo ve en su dashboard las horas trabajadas mensuales. Permitir además que el administrador cargue horas extra a un empleado cuando lo requiera."

## Clarifications

### Session 2026-06-05
- Q: ¿Cómo se registran y muestran las horas extra? → A: Como **categoría separada** (registro aparte, diferenciado de las horas de turno en dashboard y reportes).
- Q: ¿Alcance al quitar la marcación al empleado? → A: **Eliminar todo** (widget del empleado + endpoints de clock-in/out + modelo backend de fichaje manual `TimeRecord`).
- Q: ¿Quién puede cargar turnos y horas extra? → A: **Admin y Moderador**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - El empleado deja de fichar; las horas vienen del turno asignado (Priority: P1)

Como administrador, quiero que las horas trabajadas de un empleado se determinen exclusivamente por el turno que le cargo (no por una marcación manual del empleado), de modo que el control de horas sea consistente y no dependa de que el empleado fiche entrada/salida.

**Why this priority**: Es el cambio central solicitado. Elimina la inconsistencia actual (el empleado todavía puede fichar manualmente) y deja una única fuente de verdad para las horas: el turno asignado.

**Independent Test**: Iniciar sesión como empleado y comprobar que ya no existe el widget de fichaje ni forma de registrar entrada/salida; asignar un turno (p. ej. 06:00–14:00 = 8h) y verificar que las horas trabajadas se contabilizan a partir del turno.

**Acceptance Scenarios**:

1. **Given** un empleado autenticado, **When** abre su dashboard, **Then** no se muestra ningún control para registrar entrada/salida.
2. **Given** un cliente que invoca los endpoints de fichaje manual eliminados (clock-in/clock-out), **When** realiza la petición, **Then** el sistema responde 404 (el recurso ya no existe).
3. **Given** un empleado con un turno asignado de 8 horas para una fecha, **When** se generan las horas trabajadas, **Then** se contabilizan 8 horas para esa fecha sin intervención del empleado.

---

### User Story 2 - El empleado ve sus horas trabajadas mensuales (Priority: P1)

Como empleado, quiero ver en mi dashboard el total de horas trabajadas del mes (y mis horas extra por separado), de modo que pueda consultar mi actividad sin poder modificarla.

**Why this priority**: Es la única interacción que conserva el empleado con el control de horas (solo lectura). Da valor inmediato y reemplaza la información que antes daba el fichaje.

**Independent Test**: Con turnos asignados a un empleado durante el mes, iniciar sesión como ese empleado y verificar que el dashboard muestra el total de horas mensuales (read-only) y, si tiene horas extra cargadas, las muestra diferenciadas.

**Acceptance Scenarios**:

1. **Given** un empleado con 40 horas de turno en el mes, **When** abre su dashboard, **Then** ve "Horas este mes = 40" en modo solo lectura.
2. **Given** un empleado con 40 horas de turno y 5 horas extra cargadas por un admin, **When** consulta sus estadísticas, **Then** ve las horas extra diferenciadas de las horas de turno y un total que las incluye.
3. **Given** un empleado sin turnos en el mes, **When** abre su dashboard, **Then** ve 0 horas sin errores.

---

### User Story 3 - Admin/Moderador carga horas extra a un empleado (Priority: P1)

Como administrador o moderador, quiero poder cargar horas extra a un empleado para una fecha (con un motivo opcional), registradas como categoría separada, de modo que se reflejen en sus estadísticas sin confundirse con las horas de turno.

**Why this priority**: Es el segundo pedido explícito del usuario. Complementa el control de horas permitiendo ajustes manuales controlados (solo por roles autorizados).

**Independent Test**: Iniciar sesión como Admin (o Moderador), cargar 3 horas extra a un empleado para una fecha con una nota, y verificar que aparecen como horas extra en las estadísticas de ese empleado y en su dashboard, separadas de las horas de turno.

**Acceptance Scenarios**:

1. **Given** un Admin autenticado, **When** carga 3 horas extra a un empleado para una fecha, **Then** se crea un registro de horas extra (categoría separada) y las estadísticas del empleado reflejan +3 horas extra.
2. **Given** un Moderador autenticado, **When** carga horas extra a un empleado, **Then** la operación se permite (mismos permisos que cargar turnos).
3. **Given** un Empleado autenticado, **When** intenta cargar horas extra (propias o de otro), **Then** el sistema responde 403 (no autorizado).
4. **Given** una carga de horas extra con valor inválido (≤ 0 o > 24), **When** se envía, **Then** el sistema responde 400 con un mensaje de validación.
5. **Given** un empleado con horas extra cargadas, **When** un admin consulta el reporte de entradas de tiempo, **Then** las horas extra figuran con origen "extra" diferenciado de "shift".

### Edge Cases

- **Horas extra sin turno ese día**: Se permite cargar horas extra en una fecha sin turno asignado (la hora extra es independiente del turno).
- **Múltiples cargas de horas extra el mismo día**: Se permiten varias cargas de horas extra para el mismo empleado y fecha (se suman); no aplica la restricción de unicidad de los turnos.
- **Empleado inactivo / inexistente**: Cargar horas extra a un empleado inexistente o de otro tenant responde 404; el sistema valida pertenencia al tenant.
- **Horas extra para fecha futura**: Se documenta el comportamiento (permitido con advertencia, o restringido). Por defecto se permite, dado que el admin puede planificar.
- **Datos históricos de fichaje manual**: Al eliminar el fichaje manual, los registros históricos `TimeRecord` se descartan (no se usaban para las estadísticas, que ya derivan de `TimeEntry`).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST eliminar toda capacidad del empleado de registrar marcación manual (entrada/salida): no debe existir UI ni endpoints de clock-in/clock-out para el empleado.
- **FR-002**: El sistema MUST eliminar el fichaje manual legacy de administrador (endpoints clock-in/clock-out sobre `ShiftRecord`).
- **FR-003**: El sistema MUST eliminar el modelo de fichaje manual `TimeRecord` y su tabla asociada.
- **FR-004**: El sistema MUST determinar las horas trabajadas de un empleado a partir de los turnos asignados por Admin/Moderador (mecanismo `TimeEntry` existente).
- **FR-005**: El empleado MUST poder ver, en modo solo lectura, el total de horas trabajadas del mes en su dashboard, y sus horas extra por separado.
- **FR-006**: Admin y Moderador MUST poder cargar horas extra a un empleado para una fecha, con un campo de horas (> 0 y ≤ 24) y una nota/motivo opcional.
- **FR-007**: Las horas extra MUST registrarse como una categoría separada (`source = "extra"`), distinguibles de las horas de turno (`source = "shift"`) en estadísticas y reportes.
- **FR-008**: Las estadísticas de empleado (mensuales y por departamento) MUST incluir las horas extra en el total y reportarlas también de forma separada.
- **FR-009**: El sistema MUST rechazar (403) cualquier intento de un Empleado de cargar horas extra.
- **FR-010**: El sistema MUST validar que el empleado destino exista y pertenezca al tenant del usuario que carga las horas extra (404 si no).
- **FR-011**: El sistema MUST registrar en el log de auditoría la creación (y eliminación, si aplica) de horas extra (quién, a quién, fecha, horas).

### Key Entities *(include if feature involves data)*

- **TimeEntry** (existente, modificado): Registro de horas trabajadas.
  - `source`: amplía el enum a `shift` | `manual` | `extra`. Las horas extra usan `extra`.
  - `start_time` / `end_time`: pasan a ser opcionales (las horas extra no requieren horario).
  - `note`: nuevo campo opcional con el motivo de la hora extra.
- **ShiftRecord** (existente, conservado): Asignación de turno por Admin/Moderador; fuente de las horas de turno.
- **TimeRecord** (existente, **eliminado**): Fichaje manual del empleado; se elimina por completo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los dashboards de empleado dejan de mostrar el control de fichaje; no existe ruta ni endpoint funcional de clock-in/out (devuelven 404).
- **SC-002**: Las horas trabajadas mostradas al empleado coinciden exactamente con la suma de horas de turno + horas extra del mes (sin doble conteo).
- **SC-003**: Admin/Moderador pueden cargar una hora extra y verla reflejada (separada) en las estadísticas del empleado en menos de 1 operación adicional.
- **SC-004**: Un Empleado nunca puede crear, editar o eliminar horas extra (verificado por respuesta 403).
- **SC-005**: La migración de base de datos elimina la tabla de fichaje manual y agrega el soporte de horas extra sin pérdida de las horas de turno existentes.

---

## Assumptions

- Las horas de turno se siguen generando con el mecanismo existente de Feature 008 (batch nocturno / `/batch-process`) a partir de `ShiftRecord` y `ShiftType`.
- Los registros históricos de `TimeRecord` no se preservan porque no alimentaban las estadísticas (estas derivan de `TimeEntry`).
- "Categoría separada" significa: mismo almacenamiento (`TimeEntry`) con `source="extra"`, reportado por separado en las respuestas de estadísticas.
- Permisos: cargar turnos y horas extra requiere rol Admin o Moderador (consistente con el roster).

## Out of Scope (Phase 2+)

- Reintroducir el fichaje manual (clock-in/out) en cualquier forma.
- Cálculo de remuneración o recargos por horas extra (solo se registran horas).
- Aprobaciones/flujo de revisión para las horas extra.
- Edición de horas de turno ya generadas (sigue siendo responsabilidad del roster + regeneración).
