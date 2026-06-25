# Feature Specification: Configuración de Días de Vacaciones

**Feature Branch**: `012-vacation-config`
**Created**: 2026-06-25
**Status**: Draft
**Input**: User description: "Permitir configurar los días de vacaciones de los empleados de dos formas: configuración global desde /settings (Admin/Moderador) y configuración personalizada por empleado, con auditoría de los cambios. Default 30 días naturales, restricción de 2 meses de anticipación solo para el empleado, vacaciones dentro del año natural sin acumulación."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configuración global del default de vacaciones (Priority: P1)

Un usuario Admin o Moderador accede a la vista de Configuración (`/settings`) y ajusta el número de días naturales de vacaciones que la organización asigna por defecto cada año a sus empleados. El valor inicial del sistema es **30 días**. Cualquier cambio queda registrado en un historial de auditoría visible desde la misma vista.

**Why this priority**: Es el caso base del feature. Sin él, los balances anuales siguen dependiendo de un valor fijo en el código y la organización no tiene forma de ajustarlo cuando cambian sus políticas internas. Habilita inmediatamente el resto de historias.

**Independent Test**: Iniciar sesión como Admin, ir a `/settings`, cambiar el valor a 25, guardar, recargar y verificar que el valor persiste y aparece una nueva entrada en el historial de auditoría con el usuario, valor anterior (30) y valor nuevo (25).

**Acceptance Scenarios**:

1. **Given** un Admin autenticado, **When** entra a `/settings`, **Then** ve la sección "Configuración de Vacaciones" con el valor actual del default global y el historial de cambios.
2. **Given** un Moderador autenticado, **When** cambia el default global de 30 a 28 y guarda, **Then** el sistema persiste el nuevo valor, registra una entrada de auditoría y muestra confirmación.
3. **Given** un Empleado autenticado, **When** intenta acceder a la sección de configuración global, **Then** el sistema le niega el acceso (403/redirección a una vista permitida).
4. **Given** un default global de 30 y balances ya creados para el año en curso con `total_days=30`, **When** un Admin cambia el default a 25, **Then** los balances existentes mantienen 30 (el cambio solo afecta balances que se creen a partir de ese momento).
5. **Given** un Admin que intenta guardar un valor fuera del rango permitido (0, -5 o 400), **When** envía el formulario, **Then** el sistema rechaza la operación con un mensaje claro y no registra cambio en auditoría.

---

### User Story 2 - Override personalizado por empleado (Priority: P1)

Un Admin o Moderador abre la ficha de un empleado concreto y le asigna un número personalizado de días de vacaciones distinto del default global (por ejemplo, 35 días por antigüedad). El valor vacío significa "usar el default global". El cambio queda registrado en auditoría.

**Why this priority**: Sin esta capacidad, todos los empleados están atados al mismo número y la organización pierde la flexibilidad necesaria para casos individuales (antigüedad, convenios especiales, jornada reducida). Es independiente de la historia 1 — el override se aplica aunque nunca se haya tocado el default global.

**Independent Test**: Iniciar sesión como Admin, abrir la ficha de un empleado, asignar `custom_vacation_days=35`, guardar, abrir la ficha de otro empleado sin override, y comprobar que al crear su balance del próximo año el primero recibe 35 y el segundo recibe el default global.

**Acceptance Scenarios**:

1. **Given** un empleado sin override (`custom_vacation_days` vacío), **When** un Moderador asigna 35 y guarda, **Then** el sistema persiste 35 en el empleado y registra una entrada de auditoría con valor anterior (vacío/null) y valor nuevo (35).
2. **Given** un empleado con override 35, **When** un Admin lo vuelve a dejar vacío y guarda, **Then** el sistema persiste null y registra el cambio en auditoría; al crear el próximo balance el empleado recibirá el default global vigente.
3. **Given** un empleado con override 35 y un default global de 30, **When** se crea el balance anual de ese empleado, **Then** el balance se crea con `total_days=35`.
4. **Given** un empleado sin override y un default global de 28, **When** se crea su balance anual, **Then** el balance se crea con `total_days=28`.
5. **Given** un Empleado autenticado, **When** intenta editar su propio `custom_vacation_days` o el de otros, **Then** el sistema lo rechaza (no aparece el campo en su vista; el backend lo ignora si llega por API).
6. **Given** un Admin que asigna un valor fuera del rango permitido (0 o 400), **When** envía el formulario, **Then** el sistema rechaza con mensaje claro y no registra cambio en auditoría.

---

### User Story 3 - Restricción de anticipación para el empleado (Priority: P1)

Un Empleado solo puede registrar una solicitud de vacaciones cuya fecha de inicio esté al menos **2 meses** por delante del día en que la presenta. Si intenta solicitarla con menos anticipación, el sistema rechaza la operación con un mensaje claro. Admin y Moderador pueden registrar solicitudes en cualquier momento (no tienen esta restricción).

**Why this priority**: Es la regla operativa que protege la planificación del servicio de cocina. Sin ella, los empleados pueden bloquear fechas de última hora y dejar al restaurante sin cobertura. Es directamente visible al usuario.

**Independent Test**: Iniciar sesión como Empleado, intentar solicitar vacaciones con `start_date = hoy + 30 días` y verificar que el sistema rechaza con mensaje en español; reintentar con `start_date = hoy + 65 días` y verificar que se crea. Luego repetir las dos pruebas como Admin: ambas deben crearse.

**Acceptance Scenarios**:

1. **Given** un Empleado, hoy es 2026-06-25 y solicita vacaciones del 2026-07-15 al 2026-07-20, **When** envía la solicitud, **Then** el sistema la rechaza con el mensaje "Las vacaciones deben solicitarse con al menos 2 meses de anticipación".
2. **Given** un Empleado, hoy es 2026-06-25 y solicita vacaciones del 2026-08-25 al 2026-09-05, **When** envía la solicitud, **Then** el sistema la registra como Pendiente.
3. **Given** un Admin, hoy es 2026-06-25 y registra vacaciones para un empleado del 2026-07-01 al 2026-07-10, **When** envía la solicitud, **Then** el sistema la registra (no aplica la restricción de 2 meses).
4. **Given** un Moderador, **When** registra vacaciones para un empleado con cualquier fecha futura, **Then** el sistema la registra sin restricción de anticipación.
5. **Given** un Empleado, **When** ve el mensaje de rechazo por anticipación, **Then** el mensaje aparece en español, junto al campo de fecha y explica la regla.

---

### User Story 4 - Reglas de año natural (Priority: P2)

Las vacaciones se disfrutan dentro del año natural (1 de enero al 31 de diciembre del año en curso). No se acumulan al año siguiente. El balance del nuevo año arranca con los días asignados (override o default global), independientemente de los días no usados del año anterior.

**Why this priority**: Es una regla legal/operativa clara que el sistema debe garantizar. Es P2 porque la base operativa puede funcionar incluso si esta validación llega un poco después de las historias P1, pero es imprescindible antes de pasar a producción.

**Independent Test**: Como Admin, intentar registrar vacaciones del 2026-12-20 al 2027-01-05 y verificar que el sistema las rechaza por cruzar fin de año. Avanzar al 2027 (o forzar la creación del balance del nuevo año) y verificar que el balance arranca con el valor correcto, sin sumar los días no usados de 2026.

**Acceptance Scenarios**:

1. **Given** un usuario (cualquier rol) solicita vacaciones del 2026-12-20 al 2027-01-05, **When** envía la solicitud, **Then** el sistema la rechaza con un mensaje que indica que las vacaciones deben terminar antes del 31 de diciembre del año en curso.
2. **Given** un empleado con 10 días sin usar al cierre del 2026, **When** se crea su balance del 2027, **Then** el balance del 2027 arranca con los días asignados para 2027 (override o default global) sin sumar los 10 no usados.
3. **Given** una solicitud cuya `start_date` y `end_date` están en años distintos, **When** se intenta guardar, **Then** se rechaza con mensaje claro.

---

### User Story 5 - Auditoría de cambios de configuración (Priority: P2)

Todo cambio de configuración (default global o override por empleado) queda registrado en una tabla de auditoría genérica con: quién hizo el cambio, qué entidad afectó, valor anterior, valor nuevo y fecha/hora. Admin puede consultar este historial.

**Why this priority**: Cumple con el pilar constitucional "Security-First > Audit Logging" del proyecto. Es P2 porque las historias P1 deben funcionar primero, pero el feature no se considera completo sin trazabilidad.

**Independent Test**: Como Admin, cambiar el default global tres veces seguidas, abrir el historial de auditoría desde `/settings` y verificar que aparecen las tres entradas con el orden cronológico, los valores antiguos y nuevos, y el email del usuario que hizo cada cambio. Repetir con cambios al `custom_vacation_days` de un empleado.

**Acceptance Scenarios**:

1. **Given** un Admin cambia el default global de 30 a 25, **When** se guarda, **Then** se crea una entrada de auditoría con `entity_type="tenant_vacation_config"`, `action="update_default_vacation_days"`, `old_value="30"`, `new_value="25"`, `changed_by=<user_id>`, `created_at=<timestamp>`.
2. **Given** un Moderador asigna `custom_vacation_days=35` a un empleado sin override previo, **When** se guarda, **Then** se crea una entrada con `entity_type="employee_vacation_config"`, `entity_id=<employee_id>`, `action="update_employee_vacation_days"`, `old_value=null`, `new_value="35"`.
3. **Given** un Admin abre el historial de auditoría desde `/settings`, **When** la vista carga, **Then** muestra al menos las últimas 50 entradas ordenadas por `created_at` descendente con quién, cuándo, qué cambió y de qué valor a qué valor.
4. **Given** un Moderador abre el historial de auditoría desde `/settings`, **When** la vista carga, **Then** muestra las entradas de tipo configuración de vacaciones (`tenant_vacation_config` y `employee_vacation_config`) ordenadas por fecha descendente.
5. **Given** un Empleado, **When** intenta acceder al endpoint o vista del historial de auditoría, **Then** el sistema lo rechaza (403).

---

### Edge Cases

- Un Admin cambia el default global mientras un balance del año en curso ya existe para un empleado. El balance existente no se modifica; el cambio solo afecta a balances que se creen a partir de ese instante.
- Un Admin asigna `custom_vacation_days=20` a un empleado que ya tiene balance del año en curso con `total_days=30`. El balance del año en curso no se altera automáticamente; el cambio aplica al crear el balance del siguiente año (o si Admin/Moderador decide regenerar manualmente, fuera del alcance de esta spec).
- Un Empleado solicita vacaciones cuyo rango excede el balance disponible. El sistema ya rechaza por saldo insuficiente (regla preexistente); este feature no la cambia, solo añade las nuevas validaciones encima.
- Un Empleado pide vacaciones exactamente con 2 meses justos de anticipación (`start_date = hoy + 2 meses calendario`). El sistema acepta la solicitud (la regla es "al menos 2 meses").
- Un Admin intenta poner el default global o un override en 0, negativo o > 365. El sistema rechaza con mensaje claro y no registra auditoría.
- Un usuario sin permisos llama directamente a la API del endpoint de configuración. El sistema responde 403 y registra el intento fallido en el log estructurado (consistente con la política existente del proyecto).
- Concurrencia: dos Admins guardan al mismo tiempo el default global. Gana el último escritor (no se intenta resolución sofisticada en esta spec); ambos cambios quedan en auditoría.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Configuración global

- **FR-001**: El sistema MUST exponer en la vista `/settings` una sección "Configuración de Vacaciones" accesible solo para usuarios con rol Admin o Moderador.
- **FR-002**: El sistema MUST permitir editar el número de días naturales por defecto que se asignan a cada nuevo balance anual.
- **FR-003**: El default global inicial MUST ser **30 días**.
- **FR-004**: El sistema MUST validar que el default global sea un entero entre **1 y 365** (ambos incluidos) y rechazar el cambio en caso contrario con un mensaje claro.
- **FR-005**: Un cambio en el default global MUST aplicar únicamente a balances anuales que se creen a partir del momento del cambio; los balances ya existentes NO se modifican.

#### Override por empleado

- **FR-006**: El sistema MUST permitir a Admin y Moderador asignar un número personalizado de días de vacaciones por empleado desde la vista de detalle/edición del empleado.
- **FR-007**: El override por empleado MUST poder dejarse vacío/null, lo que significa "usar el default global".
- **FR-008**: El sistema MUST validar que el override (cuando no es null) sea un entero entre **1 y 365**.
- **FR-009**: Al crear un balance anual para un empleado, el sistema MUST usar su override si está definido; si no, MUST usar el default global vigente en ese momento.

#### Solicitud de vacaciones y restricciones

- **FR-010**: Un Empleado MUST poder solicitar vacaciones solo si la fecha de inicio es **mayor o igual a hoy + 2 meses calendario**. En caso contrario, el sistema MUST rechazar la solicitud con el mensaje en español "Las vacaciones deben solicitarse con al menos 2 meses de anticipación".
- **FR-011**: Admin y Moderador MUST poder registrar solicitudes de vacaciones para cualquier empleado sin la restricción de 2 meses.
- **FR-012**: El sistema MUST contar los días solicitados como **días naturales** (incluye sábados, domingos y feriados que caigan dentro del rango).
- **FR-013**: El sistema MUST rechazar solicitudes cuya `end_date` sea posterior al 31 de diciembre del año de `start_date`, con mensaje claro de "Las vacaciones deben disfrutarse dentro del año natural".
- **FR-014**: El sistema MUST rechazar solicitudes cuya `start_date` y `end_date` no pertenezcan al mismo año natural.
- **FR-015**: El sistema NO MUST acumular días no usados al balance del año siguiente; cada balance anual nuevo arranca con los días asignados según la regla FR-009.

#### Auditoría

- **FR-016**: El sistema MUST registrar en una tabla de auditoría toda actualización del default global (entidad: tenant, acción: update_default_vacation_days).
- **FR-017**: El sistema MUST registrar en la misma tabla toda actualización del override por empleado (entidad: empleado, acción: update_employee_vacation_days).
- **FR-018**: Cada entrada de auditoría MUST contener al menos: tenant_id, entity_type, entity_id, action, old_value, new_value, changed_by (id del usuario que hizo el cambio), created_at.
- **FR-019**: El historial de cambios de la configuración de vacaciones (global y por empleado) MUST estar visible para Admin y Moderador desde la vista `/settings`, ordenado por fecha descendente.
- **FR-020**: El endpoint dedicado de auditoría MUST ser accesible para Admin y Moderador; Admin puede ver todas las entradas sin restricción de tipo; Moderador solo puede ver entradas de tipo `tenant_vacation_config` y `employee_vacation_config` (configuración de vacaciones).

#### Seguridad y permisos

- **FR-021**: Los chequeos de rol MUST hacerse en la capa de servicios del backend (no únicamente en el frontend), consistente con el pilar constitucional Security-First del proyecto.
- **FR-022**: El sistema MUST denegar (403) cualquier intento de un Empleado de modificar la configuración global o el override propio o de otros.
- **FR-023**: Los intentos de acceso o modificación denegados por permisos MUST quedar registrados en el log estructurado existente del backend.

#### Internacionalización y UX

- **FR-024**: Todos los mensajes visibles al usuario (etiquetas, errores, confirmaciones, ayudas) generados por este feature MUST estar en español.
- **FR-025**: El campo de override en la ficha del empleado MUST mostrar un texto auxiliar indicando que vacío significa "usar el valor por defecto de la organización".

### Key Entities *(include if feature involves data)*

- **TenantVacationConfig (extensión de Tenant)**: Atributo `default_vacation_days` (entero, default 30) que vive en la entidad Tenant existente. Representa el número de días naturales que la organización asigna por año cuando un empleado no tiene override propio.
- **EmployeeVacationOverride (extensión de Employee)**: Atributo `custom_vacation_days` (entero opcional, null = usar default global) que vive en la entidad Employee. Persiste entre años; aplica cada vez que se crea un balance anual nuevo.
- **VacationBalance (existente, sin cambios estructurales)**: Sigue siendo el snapshot por empleado/año con `total_days` y `used_days`. Su `total_days` ahora se calcula a partir de la regla "override del empleado si existe, si no el default global vigente al crearlo". Los balances ya creados son inmutables a cambios posteriores de configuración.
- **VacationRequest (existente, sin cambios estructurales)**: Sigue siendo la solicitud con fechas y estado. Solo se añaden validaciones nuevas a su creación (anticipación de 2 meses para empleados, año natural para todos).
- **AuditLog (nueva, genérica)**: Bitácora reutilizable de cambios. Atributos: `id`, `tenant_id`, `entity_type` (cadena, p.ej. `"tenant_vacation_config"`, `"employee_vacation_config"`), `entity_id` (referencia al objeto afectado), `action` (cadena), `old_value` (cadena, puede ser null), `new_value` (cadena, puede ser null), `changed_by` (id del usuario), `created_at` (timestamp). Diseñada para usarse en futuros features además del de vacaciones.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Admin puede cambiar el default global de vacaciones de la organización y ver el cambio reflejado en menos de **5 segundos** (incluyendo la entrada de auditoría visible en el historial).
- **SC-002**: El **100 %** de los balances anuales creados después de un cambio de default global usan el nuevo valor; el **100 %** de los balances anteriores conservan su valor original.
- **SC-003**: El **100 %** de los empleados con `custom_vacation_days` definido reciben ese valor exacto al crearse su balance anual, independientemente del default global vigente.
- **SC-004**: El **100 %** de las solicitudes hechas por un Empleado con menos de 2 meses de anticipación son rechazadas con el mensaje en español definido; el **100 %** de las hechas por Admin/Moderador se procesan sin esa restricción.
- **SC-005**: El **100 %** de los cambios de configuración (global o por empleado) generan una entrada de auditoría con valor anterior, valor nuevo, usuario y timestamp.
- **SC-006**: Un Admin puede consultar el historial de los últimos cambios de configuración desde `/settings` sin necesidad de salir de esa vista.
- **SC-007**: Ningún Empleado puede modificar configuración global ni overrides (propios o de otros): **0** modificaciones exitosas en pruebas con rol Empleado contra los endpoints/UI.
- **SC-008**: El **100 %** de las solicitudes cuya fecha de fin cruza el 31 de diciembre del año en curso son rechazadas, sin importar el rol del solicitante.

---

## Assumptions

- El proyecto opera actualmente como **mono-tenant** (tenant "ILPI"). La configuración global vive en el Tenant y por tanto es por organización; el diseño ya queda preparado para multi-tenant futuro.
- Los días naturales se cuentan inclusivos en ambos extremos: `requested_days = (end_date - start_date) + 1`, lógica que ya existe en el backend y no se modifica.
- El cálculo de "hoy + 2 meses calendario" usa meses calendario (no 60 días). Si hoy es 25-jun, la fecha mínima permitida es 25-ago del mismo año; si hoy es 31-ene, será el último día de marzo (31-mar o 30-mar según implementación de `relativedelta`-equivalente). Se aceptan ambas interpretaciones siempre que sean consistentes.
- La creación del balance anual no es parte de esta spec más allá de definir QUÉ valor de `total_days` debe usar; el cuándo y cómo se ejecutan esos `_get_or_create_balance` queda como está en el backend.
- El feature no incluye una herramienta para "recalcular" balances ya creados tras un cambio de configuración. Si se necesita ese caso de uso, será una spec aparte.
- Los mensajes de error visibles al usuario están en español, consistente con el resto de la aplicación.
- La auditoría almacena `old_value` y `new_value` como cadenas serializadas para mantener la tabla genérica; las consumidoras conocen el tipo a partir de `action`.

---

## Out of Scope

- Recalcular o ajustar balances ya creados cuando cambian el default global o el override del empleado.
- Acumulación, prorrateo o transferencia de días no usados entre años.
- Notificaciones por correo / push al cambiar la configuración (puede añadirse en otra spec si se requiere).
- UI para "regenerar balance del año actual" tras cambiar un override.
- Gestión de feriados (la app cuenta días naturales sin distinguir feriados).
- Métricas o dashboards sobre la auditoría más allá del listado básico.

---

## Dependencies

- Vista `/settings` existente en el frontend (hoy solo informativa) que debe extenderse.
- Modelo `Tenant` existente (añadir `default_vacation_days`).
- Modelo `Employee` existente (añadir `custom_vacation_days`).
- Servicio existente `vacation_service.create_request` y su flujo `POST /vacations` y `POST /employee/vacation-requests`, sobre los que se añaden validaciones.
- Servicio existente `_get_or_create_balance` dentro del flujo de vacaciones, que debe leer override o default global al crear un balance nuevo.
- Sistema RBAC existente (`require_role`) y log estructurado existente, ambos a reutilizar.
