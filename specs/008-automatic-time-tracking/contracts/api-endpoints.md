# API Contracts: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Date**: 2026-03-13
**Base URL**: `/api/v1`

---

## Overview

Statistics and reporting endpoints for automatic shift-based time tracking. These are **read-only, admin/moderator only** endpoints in Phase 1. No manual clock in/out endpoints in this phase.

---

## Endpoints

### 1. Get Employee Statistics (Monthly)

**Endpoint**: `GET /time-tracking/statistics/employee/{employee_id}`

**Purpose**: Retrieve total hours, days worked, and breakdown for an employee in a specific month

**Access**: Admin, Moderator (service layer RBAC enforcement)

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `year` | integer | Yes | — | `2026` |
| `month` | integer | Yes | — | `3` (March) |
| `include_manual` | boolean | No | false | `true` (include manual entries in Phase 2+) |

**Request**:
```bash
GET /api/v1/time-tracking/statistics/employee/42?year=2026&month=3
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "employee_id": 42,
  "employee_name": "Juan García",
  "month": "2026-03",
  "statistics": {
    "total_hours": 160.0,
    "days_worked": 20,
    "average_hours_per_day": 8.0,
    "breakdown_by_shift_type": {
      "Mañana": {
        "hours": 80.0,
        "days": 10
      },
      "Noche": {
        "hours": 80.0,
        "days": 10
      }
    }
  },
  "entries_count": 20
}
```

**Error Responses**:
| Code | Condition | Body |
|------|-----------|------|
| 401 | Missing/invalid JWT | `{"detail": "Not authenticated"}` |
| 403 | Insufficient permissions (Empleado accessing) | `{"detail": "Not authorized to view statistics"}` |
| 404 | Employee not found | `{"detail": "Employee 42 not found"}` |
| 400 | Invalid month/year | `{"detail": "Invalid date parameters"}` |

---

### 2. Get Department Statistics (Monthly)

**Endpoint**: `GET /time-tracking/statistics/department`

**Purpose**: Retrieve aggregate statistics by department for a month

**Access**: Admin, Moderator (service layer RBAC)

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `year` | integer | Yes | — | `2026` |
| `month` | integer | Yes | — | `3` |
| `department` | string | No | all | `Kitchen` |
| `include_manual` | boolean | No | false | — |

**Request**:
```bash
GET /api/v1/time-tracking/statistics/department?year=2026&month=3
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "month": "2026-03",
  "departments": [
    {
      "department": "Kitchen",
      "total_hours": 320.0,
      "employee_count": 4,
      "average_hours_per_employee": 80.0,
      "days_worked": 40,
      "breakdown_by_shift_type": {
        "Mañana": {
          "hours": 160.0,
          "employee_count": 2
        },
        "Noche": {
          "hours": 160.0,
          "employee_count": 2
        }
      }
    },
    {
      "department": "Bar",
      "total_hours": 160.0,
      "employee_count": 2,
      "average_hours_per_employee": 80.0,
      "days_worked": 20,
      "breakdown_by_shift_type": { }
    }
  ]
}
```

**Error Responses**:
| Code | Condition | Body |
|------|-----------|------|
| 401 | Unauthenticated | `{"detail": "Not authenticated"}` |
| 403 | Insufficient permissions | `{"detail": "Not authorized"}` |
| 400 | Invalid parameters | `{"detail": "Invalid date parameters"}` |

---

### 3. Get Time Entries for Period

**Endpoint**: `GET /time-tracking/entries`

**Purpose**: Retrieve detailed time entries for filtering/reporting

**Access**: Admin, Moderator (service layer RBAC)

**Query Parameters**:
| Param | Type | Required | Default | Example |
|-------|------|----------|---------|---------|
| `start_date` | date | Yes | — | `2026-03-01` |
| `end_date` | date | Yes | — | `2026-03-31` |
| `employee_id` | integer | No | all | `42` |
| `department` | string | No | all | `Kitchen` |
| `source` | string | No | shift | `shift`, `manual` |
| `limit` | integer | No | 100 | `50` |
| `offset` | integer | No | 0 | `0` |

**Request**:
```bash
GET /api/v1/time-tracking/entries?start_date=2026-03-01&end_date=2026-03-31&employee_id=42
Authorization: Bearer {JWT_TOKEN}
```

**Response** (200 OK):
```json
{
  "total": 20,
  "limit": 100,
  "offset": 0,
  "entries": [
    {
      "id": 101,
      "employee_id": 42,
      "employee_name": "Juan García",
      "shift_date": "2026-03-01",
      "start_time": "06:00",
      "end_time": "14:00",
      "hours_worked": 8.0,
      "source": "shift",
      "shift_type": "Mañana",
      "created_at": "2026-03-01T01:15:00Z"
    },
    {
      "id": 102,
      "employee_id": 42,
      "employee_name": "Juan García",
      "shift_date": "2026-03-01",
      "start_time": "22:00",
      "end_time": "06:00",
      "hours_worked": 8.0,
      "source": "shift",
      "shift_type": "Noche",
      "created_at": "2026-03-01T01:15:00Z"
    }
  ]
}
```

---

### 4. Trigger Manual Batch Processing (Admin Only)

**Endpoint**: `POST /time-tracking/batch-process`

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
  "job_id": "batch-20260315-abc123",
  "status": "queued",
  "message": "Batch processing queued for date 2026-03-15",
  "estimated_entries": 15
}
```

**Error Responses**:
| Code | Condition | Body |
|------|-----------|------|
| 401 | Unauthenticated | `{"detail": "Not authenticated"}` |
| 403 | Non-admin | `{"detail": "Admin only"}` |
| 400 | Invalid date | `{"detail": "Invalid process_date"}` |
| 409 | Job already running | `{"detail": "Another batch job is running"}` |

---

## Data Transfer Objects (Pydantic Schemas)

**File**: `backend/app/schemas/time_tracking.py`

```python
from datetime import date, time, datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum

class TimeEntrySource(str, Enum):
    SHIFT = "shift"
    MANUAL = "manual"

# ========== Request Schemas ==========

class TimeEntryFilterRequest(BaseModel):
    """Filter parameters for time entry queries"""
    start_date: date
    end_date: date
    employee_id: Optional[int] = None
    department: Optional[str] = None
    source: Optional[TimeEntrySource] = TimeEntrySource.SHIFT
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)

class StatisticsFilterRequest(BaseModel):
    """Filter parameters for statistics queries"""
    year: int = Field(ge=2020, le=2100)
    month: int = Field(ge=1, le=12)
    include_manual: bool = False

class BatchProcessRequest(BaseModel):
    """Request to manually trigger batch processing"""
    process_date: date
    overwrite_existing: bool = False

# ========== Response Schemas ==========

class TimeEntryResponse(BaseModel):
    """Single time entry response"""
    id: int
    employee_id: int
    employee_name: str
    shift_date: date
    start_time: time
    end_time: time
    hours_worked: Decimal
    source: TimeEntrySource
    shift_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class TimeEntryListResponse(BaseModel):
    """Paginated list of time entries"""
    total: int
    limit: int
    offset: int
    entries: List[TimeEntryResponse]

class EmployeeStatisticsResponse(BaseModel):
    """Statistics for a single employee"""
    employee_id: int
    employee_name: str
    month: str  # "2026-03"
    statistics: Dict[str, any]  # { total_hours, days_worked, avg, breakdown_by_shift_type }
    entries_count: int

class DepartmentStatisticsResponse(BaseModel):
    """Statistics aggregated by department"""
    month: str
    departments: List[Dict[str, any]]  # Each with department, total_hours, employee_count, etc.

class BatchProcessResponse(BaseModel):
    """Response from batch processing trigger"""
    job_id: str
    status: str  # "queued", "processing", "completed", "failed"
    message: str
    estimated_entries: Optional[int] = None
    completed_at: Optional[datetime] = None
```

---

## RBAC & Access Control

**Endpoint Protection** (FastAPI dependency):

```python
# In dependencies.py or routers/time_tracking.py
from fastapi import Depends, HTTPException
from app.dependencies import get_current_user, CurrentUser
from app.models import Role

async def require_admin_or_moderator(current_user: CurrentUser = Depends(get_current_user)):
    """Ensure user is Admin or Moderator"""
    if current_user.role not in [Role.ADMIN, Role.MODERADOR]:
        raise HTTPException(status_code=403, detail="Not authorized to view statistics")
    return current_user

async def require_admin(current_user: CurrentUser = Depends(get_current_user)):
    """Ensure user is Admin (for batch processing)"""
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user
```

---

## Error Handling

**Standard Error Response**:
```json
{
  "detail": "Error message",
  "error_code": "INVALID_PARAMETERS",
  "timestamp": "2026-03-13T10:30:00Z"
}
```

**Common Errors**:
- `NOT_AUTHENTICATED` — Missing or invalid JWT
- `NOT_AUTHORIZED` — Valid JWT but insufficient permissions
- `INVALID_PARAMETERS` — Bad request parameters
- `RESOURCE_NOT_FOUND` — Employee or department doesn't exist
- `CONFLICT` — Batch job already running

---

## Rate Limiting

- **Statistics endpoints**: 100 req/min per user
- **Batch processing**: 10 req/min per tenant (prevents abuse)

---

## Versioning

**API Version**: v1 (via `/api/v1` prefix)
**Contract Version**: 1.0
**Stability**: Stable for Phase 1; may add new statistics aggregations in Phase 2

---

## Testing (Integration Tests)

**File**: `backend/tests/integration/test_time_tracking_api.py`

Key test scenarios:
1. Employee statistics: single employee, multiple shifts in month
2. Department statistics: multiple departments, aggregation correctness
3. Timezone handling: shifts across DST boundaries
4. RBAC: Empleado cannot access, Admin/Moderator can
5. Pagination: limit/offset behavior
6. Error cases: invalid dates, non-existent employee, authentication failures
