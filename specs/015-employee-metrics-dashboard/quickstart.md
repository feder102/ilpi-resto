# Quickstart – Métricas de Personal en Informes

Recorrido end-to-end para validar la feature manualmente.

## Requisitos previos

```bash
# Desde la raíz del repo
docker-compose up -d          # backend + frontend + PostgreSQL
```
- Backend en `http://localhost:8000` (docs en `/docs`), frontend en el puerto de Vite.
- Datos sembrados con `backend/app/seed.py` (tenant "ILPI" + usuario Admin).

## Datos de prueba

Para ver valores no triviales, con un usuario Admin:
1. Asigna turnos a varios empleados en el mes actual (roster) → genera `TimeEntry(source=SHIFT)`.
2. Procesa el mes si aplica (batch de fichaje automático) para materializar las horas ordinarias.
3. Carga **horas extra** a 2–3 empleados (pantalla de estadísticas de tiempo → "Cargar horas extra") → `TimeEntry(source=EXTRA)`.
4. Registra algunas **ausencias** (justificadas e injustificadas) sobre turnos asignados.
5. Aprueba alguna **solicitud de vacaciones** para que haya `used_days > 0`.

## Verificación backend (API)

Obtén un token Admin (login) y prueba los 4 endpoints:

```bash
TOKEN=<access_token_admin>
BASE=http://localhost:8000/api/v1

curl -s "$BASE/reports/overtime-ratio?date_from=2026-06-01&date_to=2026-06-30" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/reports/absenteeism?date_from=2026-06-01&date_to=2026-06-30"    -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/reports/overtime-ranking?date_from=2026-06-01&date_to=2026-06-30&limit=10" -H "Authorization: Bearer $TOKEN"
curl -s "$BASE/reports/vacation-liability?year=2026" -H "Authorization: Bearer $TOKEN"
```

**Comprobaciones**:
- `overtime-ratio`: `ratio_pct ≈ extra_hours / ordinary_hours × 100`. Con 0 horas ordinarias → `ratio_pct: null`.
- `absenteeism`: `rate_pct = total_absences / planned_shifts × 100`; `alert: true` si supera 5%; `justified + unjustified == total_absences`.
- `overtime-ranking`: empleados ordenados de mayor a menor; sin extras → `items: []`.
- `vacation-liability`: `accrued_days = round(annual_days × months_worked / 12)`; `liability_days = accrued_days − used_days`; totales = suma de items.

**RBAC** (crítico): repite cualquier endpoint con un token de **Moderador** o **Empleado** → debe responder `403 Forbidden`.

## Verificación frontend (UI)

1. Login como **Admin** → menú **Informes** (`/reports`).
2. Debajo de los dos gráficos existentes aparece la sección **"Métricas de Personal"**:
   - KPI-cards: **Ratio Extras %**, **Tasa Absentismo %** (en color de alerta si > 5%), **Pasivo Total (días)**.
   - Gráfico de barras del **ranking de horas extra** por empleado.
   - Tabla del **pasivo por empleado** (anual, devengado, usados, pasivo).
3. Cambia el rango de fechas y pulsa **Actualizar** → las tres métricas de periodo (ratio, absentismo, ranking) se recalculan.
4. Login como **Moderador** → entra a `/reports`: se ven los dos gráficos originales pero **no** la sección "Métricas de Personal".

## Gates de calidad

```bash
# Backend
cd backend
mypy app --strict
ruff check .
pytest tests/unit/test_metrics_service.py tests/integration/test_metrics_router.py

# Frontend
cd frontend
npm run lint
npm run build
```

## Criterios de aceptación cubiertos
- SC-001: las 4 métricas en una sola vista, reaccionando al filtro.
- SC-002: exactitud verificable contra cálculo manual sobre los mismos datos.
- SC-003: alerta de absentismo consistente en el umbral de 5%.
- SC-004: ranking identifica correctamente a los empleados más sobrecargados.
- SC-005: 0 accesos no-Admin exitosos (403 en API + sección oculta en UI).
