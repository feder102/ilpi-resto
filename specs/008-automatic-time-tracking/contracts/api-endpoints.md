# API Contracts: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Date**: 2026-03-15
**Base URL**: `/api/v1`
**Router Prefix**: `/employee/time-tracking`

---

## Overview

Statistics and reporting endpoints for automatic shift-based time tracking. These are **read-only, admin/moderator only** endpoints in Phase 1. No manual clock in/out endpoints in this phase.

---

## Endpoints

### 1. Get Employee Statistics (Monthly)

**Endpoint**: `GET /employee/time-tracking/statistics/employee/{employee_id}`

**Purpose**: Retrieve total hours, days worked, and breakdown for an employee in a specific month

**Access**: Admin, Moderador (service layer RBAC enforcement)

**Path Parameters**:
| Param | Type | Example |
|-------|------|---------|
| `employee_id` | UUID | `a1b2c3d4-e5f6-...` |

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `year` | integer | Yes | — | `2026` |
| `month` | integer | Yes | — | `3` (March) |
| `include_manual` | boolean | No | false | `true` |

**Request**:
```bash
GET /api/v1/employee/time-tracking/statistics/employee/a1b2c3d4-...?year=2026&month=3
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "employee_id": "a1b2c3d4-e5f6-...",
  "period": "2026-03",
  "total_hours": 160.0,
  "days_worked": 20,
  "avg_hours_per_day": 8.0,
  "breakdown_by_shift_type": {
    "Mañana": 80.0,
    "Noche": 80.0
  }
}
```

**Error Responses**:
| Code | Condition | Body |
|------|-----------|------|
| 400 | Invalid UUID or parameters | `{"error": {"message": "...", "code": "VALIDATION_ERROR"}}` |
| 403 | Insufficient permissions | `{"error": {"message": "No autorizado para ver estadísticas", "code": "FORBIDDEN"}}` |
| 404 | Employee not found | `{"error": {"message": "Empleado no encontrado", "code": "NOT_FOUND"}}` |

---

### 2. Get Department Statistics (Monthly)

**Endpoint**: `GET /employee/time-tracking/statistics/department`

**Purpose**: Retrieve aggregate statistics by department for a month

**Access**: Admin, Moderador (service layer RBAC)

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `year` | integer | Yes | — | `2026` |
| `month` | integer | Yes | — | `3` |
| `department` | string | No | all | `Cocina` |
| `include_manual` | boolean | No | false | — |

**Request**:
```bash
GET /api/v1/employee/time-tracking/statistics/department?year=2026&month=3
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "department": "Cocina",
  "period": "2026-03",
  "total_hours": 320.0,
  "unique_employees": 4,
  "avg_hours_per_employee": 80.0
}
```

---

### 3. Get Time Entries for Period

**Endpoint**: `GET /employee/time-tracking/entries`

**Purpose**: Retrieve detailed time entries for filtering/reporting

**Access**: Admin, Moderador (service layer RBAC)

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `start_date` | date | Yes | — | `2026-03-01` |
| `end_date` | date | Yes | — | `2026-03-31` |
| `employee_id` | UUID | No | all | `a1b2c3d4-...` |
| `department` | string | No | all | `Cocina` |
| `source` | string | No | shift | `shift`, `manual` |
| `limit` | integer | No | 100 | `50` |
| `offset` | integer | No | 0 | `0` |

**Request**:
```bash
GET /api/v1/employee/time-tracking/entries?start_date=2026-03-01&end_date=2026-03-31
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "total": 20,
  "limit": 100,
  "offset": 0,
  "items": [
    {
      "id": "uuid-...",
      "employee_id": "uuid-...",
      "employee_name": "Juan García",
      "employee_dni": "12345678A",
      "shift_date": "2026-03-01",
      "start_time": "06:00:00",
      "end_time": "14:00:00",
      "hours_worked": "8.00",
      "source": "shift",
      "shift_type_id": "uuid-...",
      "created_at": "2026-03-01T01:15:00Z"
    }
  ]
}
```

---

### 4. Trigger Manual Batch Processing (Admin Only)

**Endpoint**: `POST /employee/time-tracking/batch-process`

**Purpose**: Manually trigger automatic time entry generation (for testing or retroactive processing)

**Access**: Admin only (RBAC: Admin check)

**Request Body**:
```json
{
  "process_date": "2026-03-15",
  "overwrite_existing": false
}
```

**Response** (202 Accepted):
```json
{
  "job_id": "batch-2026-03-15",
  "status": "completed",
  "message": "Se crearon exitosamente 15 entradas de tiempo",
  "estimated_entries": 15
}
```

**Error Responses**:
| Code | Condition | Body |
|------|-----------|------|
| 403 | Non-admin | `{"error": {"message": "Solo administradores pueden realizar esta acción", "code": "FORBIDDEN"}}` |

---

## Error Handling

All endpoints use the `@handle_exceptions` decorator which converts `DomainException` subclasses to HTTP responses with the standard format:

```json
{
  "detail": {
    "error": {
      "message": "Mensaje descriptivo en español",
      "code": "ERROR_CODE"
    }
  }
}
```

---

## Rate Limiting

- **Statistics endpoints**: 100 req/min per user
- **Batch processing**: 10 req/min per tenant (prevents abuse)

---

## Versioning

**API Version**: v1 (via `/api/v1` prefix)
**Contract Version**: 2.0 (aligned with implementation 2026-03-15)
**Stability**: Stable for Phase 1; may add new statistics aggregations in Phase 2
