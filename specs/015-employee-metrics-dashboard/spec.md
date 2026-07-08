# Feature Specification: Métricas de Personal en Informes

**Feature Branch**: `claude/employee-metrics-dashboard-abwh8k` (numeración interna: `015-employee-metrics-dashboard`)
**Created**: 2026-07-06
**Status**: Draft
**Input**: User description: "Ampliar la vista de Informes con 4 indicadores de gestión mensual (ratio de horas extras vs. ordinarias, tasa de absentismo, ranking de horas extras, pasivo de vacaciones devengado), visibles solo para el Administrador."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Controlar el costo de horas extras y detectar sobrecarga (Priority: P1)

Como Administrador del restaurante, al final de cada mes entro a la vista de **Informes**, selecciono el rango de fechas del mes y veo de un vistazo **cuánto peso tienen las horas extras sobre las ordinarias** y **quiénes son los empleados más sobrecargados**. Con eso decido si estoy gastando de más en recargos (y si conviene contratar) y a quién redistribuir tareas antes de que se queme.

**Why this priority**: Es el impacto económico más directo y la razón principal por la que el dueño pidió la feature (control de costos + prevención de burnout). Entrega valor por sí solo aunque no existieran las otras métricas.

**Independent Test**: Se puede probar de forma aislada cargando horas ordinarias (turnos) y horas extra a varios empleados en un mes, entrando a Informes como Admin, fijando el rango de ese mes, y verificando que el ratio de horas extras vs. ordinarias y el ranking de empleados por horas extra se muestran correctamente y reaccionan al filtro de fechas.

**Acceptance Scenarios**:

1. **Given** un mes con 800 horas ordinarias y 120 horas extra registradas, **When** el Admin abre Informes con ese rango de fechas, **Then** el indicador de ratio de horas extras muestra 15% (120/800).
2. **Given** varios empleados con horas extra en el periodo, **When** el Admin consulta el ranking, **Then** ve hasta 10 empleados ordenados de mayor a menor cantidad de horas extra, cada uno con nombre y apellido.
3. **Given** un periodo sin ninguna hora ordinaria registrada, **When** el Admin abre Informes, **Then** el ratio se muestra como no disponible (o 0%) sin producir error.
4. **Given** un usuario con rol Moderador, **When** abre la vista de Informes, **Then** ve los gráficos existentes pero **no** ve la sección de métricas de personal.

---

### User Story 2 - Vigilar el absentismo y recibir una alerta de clima laboral (Priority: P2)

Como Administrador, quiero ver qué **porcentaje del tiempo planificado se pierde por ausencias** en el periodo, con una alerta visual cuando el número es preocupante, para detectar a tiempo problemas de salud, motivación o conflicto interno.

**Why this priority**: Complementa el control operativo y de clima laboral, pero es secundario al control de costos directo. Aporta valor independiente una vez que existe la superficie de métricas.

**Independent Test**: Se prueba registrando turnos planificados y ausencias (justificadas e injustificadas) en un periodo, y verificando que la tasa de absentismo se calcula sobre el total de turnos planificados, que se muestra el desglose justificada/injustificada, y que la alerta visual aparece cuando la tasa supera el 5%.

**Acceptance Scenarios**:

1. **Given** 200 turnos planificados y 6 ausencias en el periodo, **When** el Admin consulta el absentismo, **Then** la tasa se muestra como 3% y sin alerta.
2. **Given** 200 turnos planificados y 12 ausencias, **When** el Admin consulta el absentismo, **Then** la tasa se muestra como 6% con una alerta visual destacada.
3. **Given** ausencias justificadas e injustificadas en el periodo, **When** el Admin consulta el absentismo, **Then** ve el desglose entre justificadas e injustificadas como dato secundario.
4. **Given** un periodo sin ningún turno planificado, **When** el Admin consulta el absentismo, **Then** la tasa se muestra como 0% sin producir error.

---

### User Story 3 - Conocer la deuda de vacaciones del plantel (Priority: P3)

Como Administrador, quiero ver **cuántos días de vacaciones le debo a cada empleado** según lo devengado hasta la fecha, y el total del plantel, para obligar a rotar los descansos, evitar fatiga y no acumular una deuda económica grande.

**Why this priority**: Es una métrica de control de deuda de mediano plazo; valiosa pero menos urgente que el costo mensual de horas extra o el absentismo.

**Independent Test**: Se prueba con empleados de distinta antigüedad y días de vacaciones ya tomados, verificando que el pasivo devengado por empleado se calcula proporcional a los meses trabajados en el año y que el total agregado suma correctamente.

**Acceptance Scenarios**:

1. **Given** un empleado con 30 días anuales, contratado antes del año en curso, a 30 de junio (6 meses transcurridos) y 5 días ya tomados, **When** el Admin consulta el pasivo, **Then** ve un devengado de 15 días y un pasivo de 10 días.
2. **Given** un empleado contratado a mitad del año en curso, **When** el Admin consulta el pasivo, **Then** el devengado se calcula solo desde su mes de contratación.
3. **Given** varios empleados activos, **When** el Admin consulta el pasivo, **Then** ve una tabla por empleado y un total agregado de días que debe el plantel.
4. **Given** un empleado que tomó más días de los devengados a la fecha, **When** el Admin consulta el pasivo, **Then** su pasivo puede mostrarse como negativo (adelanto) sin producir error.

---

### Edge Cases

- **Sin datos en el periodo**: cada indicador debe mostrar un estado vacío o valor neutro (0 / no disponible), nunca un error.
- **División por cero**: ratio sin horas ordinarias y absentismo sin turnos planificados deben resolverse a un valor seguro.
- **Empleados inactivos**: el pasivo de vacaciones considera únicamente empleados activos.
- **Rango de fechas invertido o vacío**: la vista respeta las mismas reglas del filtro de fechas ya existente en Informes.
- **Acceso no autorizado**: un Moderador (o cualquier rol no-Admin) que intente acceder a los datos de estas métricas debe ser rechazado por el sistema, no solo ocultado en la interfaz.
- **Empleado sin turnos ni horas**: no debe aparecer en el ranking de horas extra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST mostrar, dentro de la vista de Informes, una sección de "Métricas de Personal" con cuatro indicadores: ratio de horas extras vs. ordinarias, tasa de absentismo, ranking de horas extras y pasivo de vacaciones devengado.
- **FR-002**: El sistema MUST calcular el **ratio de horas extras vs. ordinarias** del periodo seleccionado como el total de horas extra dividido por el total de horas ordinarias, expresado en porcentaje.
- **FR-003**: El sistema MUST calcular la **tasa de absentismo** del periodo como el total de ausencias (justificadas e injustificadas) dividido por el total de turnos planificados, expresado en porcentaje, e incluir el desglose entre ausencias justificadas e injustificadas.
- **FR-004**: El sistema MUST señalar con una alerta visual cuando la tasa de absentismo del periodo supere el 5%.
- **FR-005**: El sistema MUST mostrar un **ranking de hasta 10 empleados** con más horas extra en el periodo, ordenado de mayor a menor, identificando a cada empleado por nombre y apellido.
- **FR-006**: El sistema MUST calcular el **pasivo de vacaciones devengado** por empleado activo del año en curso como los días devengados proporcionalmente a los meses trabajados en el año menos los días ya tomados, y MUST presentar el total agregado del plantel.
- **FR-007**: El sistema MUST respetar el mismo filtro de rango de fechas ya presente en la vista de Informes para las métricas basadas en periodo (ratio, absentismo, ranking).
- **FR-008**: El sistema MUST restringir el acceso a estas métricas exclusivamente al rol Administrador, tanto ocultando la sección en la interfaz para otros roles como rechazando el acceso a los datos subyacentes para cualquier rol distinto de Administrador.
- **FR-009**: Los usuarios con rol Moderador MUST conservar el acceso al resto de la vista de Informes (gráficos existentes) sin ver la nueva sección de métricas de personal.
- **FR-010**: El sistema MUST manejar los casos sin datos (sin horas ordinarias, sin turnos planificados, sin empleados) devolviendo valores neutros seguros en lugar de errores.
- **FR-011**: Todos los cálculos MUST considerar únicamente los datos de la organización del usuario (aislamiento por organización).

### Key Entities *(include if feature involves data)*

- **Registro de Horas**: horas trabajadas por un empleado en una fecha, distinguidas entre ordinarias (derivadas del turno) y extra (cargadas manualmente). Base del ratio y del ranking.
- **Ausencia**: falta de un empleado en un turno planificado, marcada como justificada o injustificada. Numerador del absentismo.
- **Turno Planificado**: asignación de turno a un empleado en una fecha. Denominador del absentismo.
- **Saldo de Vacaciones**: días anuales asignados y días ya usados por empleado y año. Base del pasivo devengado.
- **Empleado**: persona del plantel, con fecha de contratación (para el prorrateo del devengamiento) y estado activo/inactivo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Administrador puede obtener las cuatro métricas del mes en una sola vista, ajustando el rango de fechas, en menos de 10 segundos y sin exportar datos a otra herramienta.
- **SC-002**: El ratio de horas extras y la tasa de absentismo mostrados coinciden exactamente con un cálculo manual sobre los mismos datos del periodo (100% de exactitud en la verificación).
- **SC-003**: La alerta de absentismo aparece de forma consistente en el 100% de los periodos cuya tasa supera el 5% y no aparece cuando es igual o inferior.
- **SC-004**: El ranking identifica correctamente a los empleados con más horas extra, permitiendo al Administrador nombrar al top de sobrecargados sin consultar otra pantalla.
- **SC-005**: Ningún usuario sin rol Administrador puede visualizar ni obtener los datos de las métricas de personal (0 accesos no autorizados exitosos).
