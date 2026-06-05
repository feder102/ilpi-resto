# Feature 009: Portal de Empleado consistente + Reportes con datos reales

**Estado**: En desarrollo
**Tipo**: Mejora de UX + corrección de funcionalidad
**Fecha**: 2026-06-02
**Metodología**: Spec ligero (decisión del stakeholder)

---

## 1. Contexto y Problema

El portal del **empleado** se siente tosco e inconsistente respecto al portal del **admin**, y no
está bien adaptado a celulares. Además, la zona de **reportes/métricas** muestra gráficos vacíos
porque lee de la fuente de datos equivocada.

Problemas concretos detectados:

- **Navegación incompleta**: `EmployeeLayout` no incluye link a "Mis Vacaciones" pese a que la
  ruta existe → el empleado no puede llegar desde el sidebar.
- **Dashboard pobre**: `EmployeeDashboardView` muestra email + rol hardcodeado, sin métricas
  reales, sin fichaje ni saldo de vacaciones, con `div`/`card` crudos en vez de los componentes
  UI compartidos del admin.
- **Duplicación**: existen `EmployeeDashboard.tsx` y `EmployeeTimeTracking.tsx` sin montar.
- **No mobile-friendly**: padding fijo, `TimeClock` con botón circular fijo, `VacationBalanceCard`
  que no apila en pantallas chicas.
- **Reportes con datos vacíos**: `dashboard_service.get_hours_by_day` lee de `ShiftRecord`
  (fichaje manual, casi siempre vacío) en vez de `TimeEntry` (generado por el batch de Feature 008).
- **Errores silenciados** en `ReportsView` (`catch {}`), sin filtros de fecha.
- **`ModeratorReports` vacío** (stub "En desarrollo").

## 2. Objetivo

Entregar en un solo PR: (1) un portal de empleado consistente con el admin y adaptado a mobile, y
(2) una zona de reportes/métricas que muestre datos reales, con filtros de fecha, manejo de errores
visible y el reporte de moderador implementado.

## 3. User Stories

### US1 — Portal de empleado consistente (P1)
**Como** empleado, **quiero** un panel que use el mismo lenguaje visual que el resto del sistema y
me muestre mi información clave de un vistazo, **para** orientarme rápido y sin fricción.

Criterios de aceptación:
- El sidebar del empleado incluye Panel, Mi Calendario, **Mis Vacaciones** y Mis Estadísticas.
- El dashboard muestra métricas reales en tarjetas (`StatCard`): días de vacaciones disponibles,
  horas trabajadas este mes, estado actual y próximo turno.
- El dashboard integra el widget de fichaje (`TimeClock`).
- Se usan los componentes UI compartidos (`Card`, `Button`, `StatCard`, `Alert`).
- Se eliminan las vistas duplicadas no montadas.

### US2 — Portal de empleado adaptado a mobile (P1)
**Como** empleado que usa el celular, **quiero** que todas las vistas se vean bien en pantalla
chica, **para** poder fichar, ver mis turnos y solicitar vacaciones desde el móvil.

Criterios de aceptación:
- Todas las vistas de empleado son legibles y usables a ~390px de ancho (sin scroll horizontal
  no intencional; tablas con scroll contenido).
- `TimeClock` y `VacationBalanceCard` apilan/escalan correctamente en mobile.

### US3 — Reportes con datos reales y filtros (P1)
**Como** admin/moderador, **quiero** ver reportes con datos reales y poder filtrar por rango de
fechas, **para** tomar decisiones sobre horas trabajadas y distribución de personal.

Criterios de aceptación:
- "Horas por día" se calcula desde `TimeEntry` (datos del batch), no desde `ShiftRecord`.
- Los endpoints `/reports/*` aceptan `date_from`/`date_to` (default: últimos 30 días).
- `ReportsView` tiene filtro de rango de fechas que recarga los datos.
- Los errores de carga se muestran al usuario (no se silencian); hay estados vacíos claros.
- `ModeratorReports` está implementado (scopeado al departamento del moderador vía RLS del backend).

## 4. Fuera de alcance

- Exportación a PDF/Excel (sigue como "próximamente").
- Fichaje manual real (clock-in/out) más allá del widget existente.
- Cambios en el modelo de datos / migraciones.

## 5. Checklist

- [ ] `EmployeeLayout` con link a Vacaciones + responsive
- [ ] `EmployeeDashboardView` reescrito con StatCards reales + TimeClock
- [ ] Componentes de empleado responsive (TimeClock, VacationBalanceCard, vistas)
- [ ] Vistas duplicadas eliminadas
- [ ] `dashboard_service.get_hours_by_day` migrado a `TimeEntry` + filtros de fecha
- [ ] `on_shift` recalculado desde `TimeEntry`
- [ ] `/reports/*` con query params de fecha
- [ ] `ReportsView` con filtro de fecha, errores visibles y estados vacíos
- [ ] `ModeratorReports` implementado
- [ ] Tests backend en verde + `npm run build`/`lint` sin errores
- [ ] Verificación e2e con capturas
- [ ] PR creado con capturas
