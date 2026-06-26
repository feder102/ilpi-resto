# Feature Specification: ABM de Departamentos

**Feature Branch**: `feature/department-abm` (numeración interna: `014-department-abm`)
**Created**: 2026-06-26
**Status**: Draft
**Input**: User description: "ABM de departamentos para administradores: actualmente los departamentos están hardcoded vía seed (Cocina, Atención al Público, Barra, Dirección) y no pueden ser editados ni agregados. La feature debe permitir al rol Admin crear, leer, actualizar y eliminar departamentos desde una nueva sección de la app. Cada departamento tiene nombre (único por tenant), descripción opcional, color e icono visual, y estado activo/inactivo. Debe existir un departamento 'Sin asignar' creado por el sistema (no editable ni eliminable, marcado con badge 'Sistema'). Al eliminar un departamento que tenga empleados o equipos asignados, todos esos empleados y equipos deben ser reasignados automáticamente al departamento 'Sin asignar' para que el admin los reasigne luego. Antes de confirmar la eliminación, el sistema debe consultar cuántos empleados y equipos serán afectados y mostrar al admin un modal de confirmación que indique explícitamente: 'Se reasignarán N empleados y M equipos al departamento Sin asignar. Esta acción no se puede deshacer.' Los moderadores y empleados no pueden acceder al ABM, pero sí pueden leer la lista de departamentos para llenar dropdowns existentes (selectores en formularios de empleados, filtros, etc.). La feature reemplaza el campo string 'department' en Employee y Team por una FK a la nueva tabla Departments."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin gestiona el catálogo de departamentos (Priority: P1)

Como administrador del restaurante necesito agregar, ver y reorganizar los departamentos de mi organización para reflejar cambios en la estructura operativa (apertura de un nuevo sector como "Delivery" o "Lavadero", separación de áreas, etc.) sin depender del equipo técnico.

**Why this priority**: Es el dolor principal hoy. Los departamentos están hardcoded en el seed y cualquier cambio requiere intervención del equipo técnico, lo que bloquea operativamente al admin y obliga a usar un departamento que no representa la realidad del local.

**Independent Test**: Un Admin loguea en la app, navega a la nueva sección "Departamentos", crea un departamento nuevo con nombre, descripción, color e icono, y verifica que el departamento aparece tanto en el listado como en el dropdown de departamentos de la pantalla de empleados.

**Acceptance Scenarios**:

1. **Given** un Admin autenticado, **When** ingresa a la sección "Departamentos", **Then** ve la lista completa de departamentos del tenant (incluyendo "Sin asignar" con badge "Sistema") con su nombre, descripción, color, icono, estado y cantidad de empleados asignados.
2. **Given** un Admin en la sección "Departamentos", **When** crea un departamento con nombre "Lavadero", descripción opcional, color e icono, **Then** el departamento se persiste, aparece en el listado y queda disponible inmediatamente como opción válida en cualquier selector de departamento (alta/edición de empleados, filtros, equipos).
3. **Given** un Admin que intenta crear un departamento con un nombre que ya existe en el tenant, **When** envía el formulario, **Then** recibe un mensaje claro indicando "Ya existe un departamento con ese nombre" y el departamento no se crea.
4. **Given** un Moderador o Empleado autenticado, **When** intenta acceder a la sección "Departamentos" o llama a los endpoints de creación/modificación/borrado, **Then** la sección no aparece en su menú y cualquier intento directo recibe respuesta de acceso denegado.
5. **Given** un Moderador o Empleado autenticado, **When** abre el formulario de empleados o un filtro por departamento, **Then** ve la lista actualizada de departamentos disponibles para usar como referencia (lectura).

---

### User Story 2 - Admin edita un departamento existente (Priority: P2)

Como administrador necesito poder renombrar, cambiar la descripción, color o icono de un departamento, y activarlo o desactivarlo, para mantener actualizada la nomenclatura visual y operativa de la organización.

**Why this priority**: Es importante para mantener el catálogo limpio y consistente sin tener que eliminar y recrear (lo cual perdería historial), pero el negocio puede operar como MVP con solo alta y baja.

**Independent Test**: Un Admin abre un departamento existente desde el listado, cambia su nombre, color e icono, y guarda; al volver al listado y al editar un empleado, los cambios se ven reflejados con los nuevos datos.

**Acceptance Scenarios**:

1. **Given** un Admin en el listado, **When** selecciona un departamento no-sistema y edita su nombre, descripción, color o icono, **Then** los cambios se persisten y todos los empleados/equipos que lo tenían asignado ahora muestran el nombre nuevo (la asignación se mantiene, solo cambian los datos del catálogo).
2. **Given** un Admin que cambia el estado de un departamento a "Inactivo", **When** guarda, **Then** el departamento desaparece de los selectores de alta y edición de empleados/equipos, pero sigue siendo visible en reportes históricos y en el ABM (con un filtro "Mostrar inactivos").
3. **Given** un Admin que reactiva un departamento previamente inactivo, **When** guarda, **Then** el departamento vuelve a estar disponible en todos los selectores.
4. **Given** un Admin que intenta editar el departamento "Sin asignar", **When** abre el detalle, **Then** los campos están en modo solo lectura y se muestra el badge "Sistema" con un mensaje "Este departamento es del sistema y no puede modificarse".
5. **Given** un Admin que intenta renombrar un departamento al nombre de otro existente en el mismo tenant, **When** guarda, **Then** recibe un mensaje de error de unicidad y los cambios no se aplican.

---

### User Story 3 - Admin elimina un departamento con reasignación segura (Priority: P3)

Como administrador necesito eliminar un departamento que ya no aplica a mi operación, sin perder a los empleados ni equipos que tenía asignados; el sistema debe avisarme cuántos serán afectados y reubicarlos en "Sin asignar" para que pueda reasignarlos manualmente después.

**Why this priority**: Es la operación más sensible porque mueve datos en cascada. La organización puede sobrevivir un tiempo con departamentos viejos marcados como inactivos (US2), pero para una experiencia ABM completa es necesario poder borrarlos con seguridad.

**Independent Test**: Un Admin asigna varios empleados a un departamento de prueba, intenta eliminarlo, verifica que el modal de confirmación muestra el conteo exacto, confirma la operación y comprueba que los empleados ahora aparecen en "Sin asignar".

**Acceptance Scenarios**:

1. **Given** un Admin que hace click en "Eliminar" sobre un departamento con N empleados y M equipos asignados, **When** se abre el modal de confirmación, **Then** ve el texto exacto: "Se reasignarán **N empleados** y **M equipos** al departamento **'Sin asignar'**. Esta acción no se puede deshacer." y dos botones "Cancelar" y "Eliminar".
2. **Given** el modal de confirmación abierto, **When** el Admin presiona "Eliminar", **Then** todos los empleados y equipos del departamento son reasignados a "Sin asignar" en una sola transacción, el departamento queda eliminado del catálogo activo y se muestra un toast de éxito con el resumen.
3. **Given** un Admin que elimina un departamento sin empleados ni equipos asignados, **When** se abre el modal, **Then** el texto indica "Este departamento no tiene empleados ni equipos asignados. Esta acción no se puede deshacer." y al confirmar el departamento se elimina sin reasignaciones.
4. **Given** un Admin que intenta eliminar el departamento "Sin asignar", **When** lo selecciona, **Then** el botón "Eliminar" está deshabilitado y un tooltip indica "El departamento Sin asignar es del sistema y no puede eliminarse".
5. **Given** un Admin que presiona "Cancelar" en el modal, **When** se cierra el modal, **Then** el departamento no se elimina y ninguna asignación cambia.
6. **Given** que la operación de eliminación falla a mitad del proceso (p. ej. error de base), **When** el sistema responde, **Then** se hace rollback completo, ningún empleado/equipo queda reasignado y el departamento permanece en el catálogo, con un mensaje de error al admin.

---

### Edge Cases

- **Departamento "Sin asignar" ausente**: si por algún motivo el departamento sistema no existe en el tenant al momento de un borrado, el sistema lo crea automáticamente antes de reasignar para garantizar que la operación nunca falle por ausencia del destino.
- **Nombre con espacios, mayúsculas o tildes**: el chequeo de unicidad ignora diferencias de mayúsculas/minúsculas pero respeta acentos (p.ej. "Cocina" y "cocina" se consideran duplicados; "Cocina" y "Cocína" no).
- **Departamento inactivo seleccionado en historial**: reportes y shifts pasados siguen mostrando el departamento original aunque esté inactivo o eliminado-reasignado, conservando el contexto histórico.
- **Validación de color**: el color debe ser un valor visual válido (hex `#RRGGBB`); si el admin no elige uno, se asigna un color por defecto del catálogo del sistema.
- **Validación de icono**: el icono se selecciona de un catálogo predefinido (set de iconos Lucide); si el admin no elige uno, se asigna un icono por defecto.
- **Login concurrente**: si dos admins editan el mismo departamento simultáneamente, gana el último que guarda (last-write-wins) y se registra en el audit log con timestamp para auditoría.
- **Filtro por departamento eliminado**: si un usuario tenía un filtro guardado por un departamento que fue eliminado, el filtro se invalida y la lista se muestra completa con un aviso suave.
- **Empleado con departamento "Sin asignar"**: el sistema permite a empleados estar asignados a "Sin asignar"; el admin debe poder filtrar/listar esos empleados explícitamente para reasignarlos.

## Requirements *(mandatory)*

### Functional Requirements

#### Catálogo y gestión (CRUD)

- **FR-001**: El sistema MUST exponer una sección "Departamentos" en la navegación visible solamente al rol Admin.
- **FR-002**: El sistema MUST permitir al Admin crear un departamento con nombre (obligatorio, único por tenant, ignorando mayúsculas/minúsculas), descripción opcional, color (con default del sistema si no se especifica) e icono (con default del sistema si no se especifica).
- **FR-003**: El sistema MUST mostrar al Admin el listado completo de departamentos del tenant con sus atributos (nombre, descripción, color, icono, estado activo/inactivo, badge "Sistema" si aplica, cantidad de empleados asignados, cantidad de equipos asignados).
- **FR-004**: El sistema MUST permitir al Admin editar el nombre, descripción, color, icono y estado activo/inactivo de cualquier departamento que NO sea sistema.
- **FR-005**: El sistema MUST permitir al Admin eliminar cualquier departamento que NO sea sistema, ejecutando la reasignación segura descrita en FR-010 a FR-013.
- **FR-006**: El sistema MUST exponer la lista de departamentos activos a Moderadores y Empleados como datos de lectura para llenar selectores y filtros en otras pantallas (no acceso al ABM).
- **FR-007**: El sistema MUST rechazar cualquier intento de creación/edición/borrado de departamentos proveniente de roles distintos a Admin con respuesta de acceso denegado.

#### Departamento "Sin asignar" (sistema)

- **FR-008**: El sistema MUST garantizar la existencia de exactamente un departamento por tenant con identidad "Sin asignar" marcado como sistema, no editable ni eliminable, y lo crea automáticamente al iniciar el tenant.
- **FR-009**: El sistema MUST mostrar el departamento "Sin asignar" en todos los selectores de departamento, identificado visualmente con un badge "Sistema".

#### Eliminación con reasignación

- **FR-010**: El sistema MUST calcular y exponer al Admin, antes de cualquier borrado, el conteo exacto de empleados y equipos que actualmente referencian el departamento a eliminar.
- **FR-011**: El sistema MUST mostrar al Admin un modal de confirmación con el texto exacto: "Se reasignarán **N empleados** y **M equipos** al departamento **'Sin asignar'**. Esta acción no se puede deshacer.", o una variante con conteo cero cuando no hay asignaciones, antes de ejecutar el borrado.
- **FR-012**: El sistema MUST, al confirmar el borrado, mover dentro de una transacción atómica todas las referencias de empleados y equipos del departamento eliminado al departamento "Sin asignar" del mismo tenant, y luego eliminar el departamento del catálogo activo.
- **FR-013**: El sistema MUST garantizar atomicidad: si cualquier paso de la reasignación o eliminación falla, el sistema hace rollback completo y deja el departamento y todas sus asignaciones intactos, devolviendo un error claro al Admin.

#### Estado activo/inactivo

- **FR-014**: El sistema MUST permitir al Admin desactivar un departamento sin eliminarlo; los departamentos inactivos NO aparecen en los selectores de alta/edición de empleados ni equipos, pero SÍ aparecen en el listado del ABM (filtrable) y en datos históricos.
- **FR-015**: El sistema MUST permitir al Admin reactivar un departamento previamente desactivado, restaurándolo en todos los selectores.

#### Unicidad y validación

- **FR-016**: El sistema MUST validar la unicidad del nombre del departamento por tenant (case-insensitive) tanto en alta como en edición, devolviendo un mensaje claro al Admin si la regla se viola.
- **FR-017**: El sistema MUST validar el formato del color (hex `#RRGGBB`) y la pertenencia del icono al catálogo soportado; si la validación falla, se aplican los valores por defecto del sistema y se notifica al Admin.

#### Auditoría e historial

- **FR-018**: El sistema MUST registrar en el audit log toda operación de creación, edición, cambio de estado y eliminación de departamentos, incluyendo el usuario que la realizó, timestamp, departamento afectado y, en el caso de eliminación, los conteos de empleados y equipos reasignados.
- **FR-019**: El sistema MUST preservar la trazabilidad histórica: shifts, vacaciones u otros registros pasados siguen mostrando el nombre del departamento al momento del registro, aún si el departamento fue posteriormente eliminado o renombrado.

### Key Entities *(include if feature involves data)*

- **Departamento**: catálogo administrable de áreas operativas. Atributos: nombre (único por tenant), descripción opcional, color visual, icono visual, estado (activo/inactivo), flag de sistema (true solo para "Sin asignar"), pertenencia a tenant. Relaciones: tiene N Empleados asignados y M Equipos asignados.
- **Empleado**: ya existente, mantiene una referencia obligatoria a un Departamento. La referencia pasa de ser un nombre suelto a un vínculo formal con el catálogo, lo que permite renombrar el departamento sin tocar al empleado.
- **Equipo**: ya existente, mantiene una referencia obligatoria a un Departamento bajo las mismas reglas que Empleado.
- **Sin asignar**: instancia especial de Departamento creada por el sistema, una por tenant, protegida (no se renombra, no se elimina, no se desactiva). Funciona como destino de fallback cuando un departamento es eliminado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Admin puede crear un nuevo departamento (alta completa con nombre, color e icono) y verlo disponible en los selectores de empleados en menos de **1 minuto**, sin asistencia técnica.
- **SC-002**: La eliminación de un departamento con hasta **500 empleados y 50 equipos** asignados completa la reasignación a "Sin asignar" y deja el catálogo consistente en **menos de 5 segundos**, sin pérdida de datos en ningún caso.
- **SC-003**: El **100 %** de los intentos de eliminar el departamento "Sin asignar" son bloqueados por el sistema y comunicados claramente al Admin.
- **SC-004**: El **100 %** de los borrados de departamentos muestran al Admin el modal de confirmación con el conteo exacto de empleados y equipos a reasignar antes de ejecutar la operación.
- **SC-005**: Las operaciones de ABM de departamentos quedan restringidas a Admin: el **0 %** de los intentos hechos por Moderador o Empleado tiene éxito; ambos roles siguen viendo la lista actualizada de departamentos en sus pantallas existentes.
- **SC-006**: Tras la migración inicial de la feature, el **100 %** de los empleados y equipos preexistentes conservan su departamento original (sin pérdida de asignación) y los reportes históricos no muestran inconsistencias.
- **SC-007**: La sección admin de departamentos reduce las solicitudes al equipo técnico para "agregar/renombrar departamento" a **cero por mes** dentro del primer mes de adopción.

## Assumptions

- El tenant tiene exactamente un departamento "Sin asignar" creado y mantenido por el sistema; nunca se elimina ni se renombra. Si se descubre faltante, el sistema lo recrea automáticamente.
- La cantidad de departamentos por tenant es del orden de unidades a decenas (no cientos), por lo que la lista completa puede mostrarse sin paginación obligatoria; un filtro de búsqueda y un toggle "Mostrar inactivos" alcanzan.
- Los reportes y datos históricos pueden seguir mostrando nombres de departamentos eliminados o renombrados; la consistencia visual se garantiza vía el nombre del departamento al momento del registro, no en tiempo real.
- El catálogo de iconos disponibles está predefinido a nivel de aplicación; el Admin elige entre opciones (no sube íconos propios).
- Los moderadores y empleados pueden leer departamentos pero no editar el catálogo; esto es consistente con su rol y no introduce nuevos requisitos de RBAC.
- Esta feature reemplaza completamente el manejo string del campo "department" en Employee y Team por un vínculo formal al catálogo; el contenido actual (Cocina, Atención al Público, Barra, Dirección) se migra preservando las asignaciones de cada empleado y equipo.

## Dependencies

- El sistema de tenants ya existe y todo Departamento pertenece a uno (multi-tenant aware).
- Existe un sistema de RBAC con los roles Admin, Moderador y Empleado, y los checks se hacen a nivel de servicio.
- Existen ya las entidades Empleado y Equipo con un campo de departamento (actualmente string) que será reemplazado.
- Existe un sistema de audit logging para registrar acciones sensibles del Admin.
