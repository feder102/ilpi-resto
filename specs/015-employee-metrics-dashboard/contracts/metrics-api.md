# API Contract: Métricas de Personal en Informes

**Router**: `backend/app/routers/metrics.py` · **Prefijo**: `/api/v1` · **Tag**: `metrics`
**Autorización**: TODOS los endpoints son **Admin-only** — `Depends(require_role("Admin"))` en el router + check `role == "Admin"` en el service. Un rol no-Admin recibe `403 Forbidden` con el esquema de error estándar del proyecto.

Autenticación: `Authorization: Bearer <access_token>` (como el resto de la API). `tenant_id` se extrae del JWT (`TenantId`).

---

## GET /api/v1/reports/overtime-ratio

Ratio de horas extras vs. ordinarias del periodo.

**Query params**:
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `date_from` | `date` (YYYY-MM-DD) | hoy − 30 días | Inicio del rango (inclusive) |
| `date_to` | `date` (YYYY-MM-DD) | hoy | Fin del rango (inclusive) |

**200 Response**:
```json
{
  "date_from": "2026-06-01",
  "date_to": "2026-06-30",
  "ordinary_hours": 800.0,
  "extra_hours": 120.0,
  "ratio_pct": 15.0
}
```
`ratio_pct` es `null` cuando `ordinary_hours == 0`.

---

## GET /api/v1/reports/absenteeism

Tasa de absentismo del periodo con desglose y bandera de alerta.

**Query params**: `date_from`, `date_to` (igual que arriba).

**200 Response**:
```json
{
  "date_from": "2026-06-01",
  "date_to": "2026-06-30",
  "total_absences": 12,
  "justified_absences": 5,
  "unjustified_absences": 7,
  "planned_shifts": 200,
  "rate_pct": 6.0,
  "alert": true
}
```
`rate_pct == 0` y `alert == false` cuando `planned_shifts == 0`. `alert = rate_pct > 5.0`.

---

## GET /api/v1/reports/overtime-ranking

Top N empleados por horas extra en el periodo.

**Query params**:
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `date_from` | `date` | hoy − 30 días | Inicio del rango |
| `date_to` | `date` | hoy | Fin del rango |
| `limit` | `int` (1–50) | 10 | Máximo de empleados a devolver |

**200 Response**:
```json
{
  "date_from": "2026-06-01",
  "date_to": "2026-06-30",
  "items": [
    { "employee_id": "uuid", "employee_name": "Ana García", "extra_hours": 34.5 },
    { "employee_id": "uuid", "employee_name": "Luis Pérez", "extra_hours": 22.0 }
  ]
}
```
`items` vacío si no hay horas extra en el periodo. Ordenado por `extra_hours` descendente.

---

## GET /api/v1/reports/vacation-liability

Pasivo de vacaciones devengado por empleado activo y agregado del plantel.

**Query params**:
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `year` | `int` | año actual | Año de cálculo del devengamiento |

**200 Response**:
```json
{
  "year": 2026,
  "items": [
    {
      "employee_id": "uuid",
      "employee_name": "Ana García",
      "annual_days": 30,
      "months_worked": 6,
      "accrued_days": 15,
      "used_days": 5,
      "liability_days": 10
    }
  ],
  "total_accrued": 15,
  "total_used": 5,
  "total_liability": 10
}
```
`items` vacío y totales 0 si no hay empleados activos. `liability_days` puede ser negativo (adelanto).

---

## Errores comunes

| Código | Situación | Cuerpo |
|---|---|---|
| `401 Unauthorized` | Sin token o token inválido/expirado | esquema de error estándar |
| `403 Forbidden` | Rol distinto de Admin | `{ "error": { "code": "...", "message": "No tiene permisos para esta acción" } }` |
| `422 Unprocessable Entity` | Query param mal formado (fecha inválida, `limit` fuera de rango) | detalle de validación de FastAPI/Pydantic |

Todos los endpoints son **read-only** e idempotentes (GET). No modifican estado observable de negocio.
