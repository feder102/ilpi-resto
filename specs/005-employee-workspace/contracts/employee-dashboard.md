# API Contract: Employee Dashboard

**Feature**: 005-employee-workspace | **Endpoints**: Dashboard, Shifts, Vacations

---

## GET /employee/dashboard

**Purpose**: Get dashboard overview with recent activity and summary data

**Authentication**: Required (JWT with Empleado role)

**Response 200 OK**:
```json
{
  "employee": {
    "id": "uuid",
    "name": "Juan García López",
    "email": "juan@ilpi.es",
    "role": "Empleado"
  },
  "today": {
    "date": "2026-03-09",
    "has_shift": true,
    "shift_type": "Mañana",
    "entry_time": "08:00",
    "exit_time": "14:00",
    "clock_status": "clocked-in",
    "clock_in_time": "08:30:15",
    "elapsed_time_formatted": "1h 30m"
  },
  "vacation_balance": {
    "year": 2026,
    "total_days": 22,
    "used_days": 3,
    "remaining_days": 19
  },
  "upcoming_events": [
    {
      "type": "shift",
      "date": "2026-03-10",
      "shift_type": "Noche",
      "entry_time": "22:00",
      "exit_time": "06:00"
    },
    {
      "type": "vacation",
      "date_from": "2026-03-20",
      "date_to": "2026-03-24",
      "status": "Pendiente",
      "message": "Awaiting approval"
    }
  ]
}
```

---

## GET /employee/shifts

**Purpose**: Get employee's assigned shifts for a date range

**Authentication**: Required (JWT with Empleado role)

**Query Parameters**:
- `date_from`: "YYYY-MM-DD" (optional, default: 7 days ago)
- `date_to`: "YYYY-MM-DD" (optional, default: 60 days from today)

**Response 200 OK**:
```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2026-03-09",
      "shift_type": "Mañana",
      "shift_type_id": "uuid",
      "entry_time": "08:00",
      "exit_time": "14:00",
      "status": "active",
      "task_label": null,
      "vacation_overlap": false
    },
    {
      "id": "uuid",
      "date": "2026-03-10",
      "shift_type": "Noche",
      "shift_type_id": "uuid",
      "entry_time": "22:00",
      "exit_time": "06:00",
      "status": "active",
      "task_label": null,
      "vacation_overlap": true,
      "vacation_status": "Pendiente"
    }
  ],
  "total": 45,
  "date_from": "2026-03-02",
  "date_to": "2026-05-09"
}
```

**Notes**:
- `vacation_overlap`: True if employee has an approved vacation request on this date
- `entry_time`/`exit_time`: May be null for some shift types
- Returns only current employee's shifts (enforced at service layer)

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "date_from must be before date_to"
  }
}
```

---

## GET /employee/vacations/balance

**Purpose**: Get employee's vacation balance for the current year

**Authentication**: Required (JWT with Empleado role)

**Response 200 OK**:
```json
{
  "year": 2026,
  "total_days": 22,
  "used_days": 3,
  "remaining_days": 19,
  "pending_approval": 5,
  "rejected": 0,
  "cancelled": 0,
  "breakdown": {
    "approved": 3,
    "pending": 5,
    "rejected": 0,
    "cancelled": 0
  }
}
```

**Notes**:
- `used_days`: Count of approved vacation days only
- `pending_approval`: Count of requested days awaiting approval
- `remaining_days`: Computed as `total_days - used_days` (does NOT subtract pending)

---

## GET /employee/vacations/requests

**Purpose**: Get employee's vacation requests (all statuses)

**Authentication**: Required (JWT with Empleado role)

**Query Parameters**:
- `status`: "Pendiente|Aprobado|Rechazado|Cancelado" (optional, filter by status)
- `year`: int (optional, default: current year)
- `page`: int (optional, default: 1)
- `size`: int (optional, default: 20, max: 100)

**Response 200 OK**:
```json
{
  "items": [
    {
      "id": "uuid",
      "start_date": "2026-03-20",
      "end_date": "2026-03-24",
      "requested_days": 5,
      "status": "Pendiente",
      "created_at": "2026-03-01T10:30:00Z",
      "reviewed_by": null,
      "reviewed_at": null,
      "reason": "Family trip"
    },
    {
      "id": "uuid",
      "start_date": "2026-02-15",
      "end_date": "2026-02-16",
      "requested_days": 2,
      "status": "Aprobado",
      "created_at": "2026-02-01T14:20:00Z",
      "reviewed_by": "admin-uuid",
      "reviewed_at": "2026-02-01T16:00:00Z",
      "reason": "Doctor's appointment"
    }
  ],
  "total": 8,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

**Filters Applied**: Only current employee's requests (enforced at service layer)

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "INVALID_YEAR",
    "message": "Year must be between 2000 and 2100"
  }
}
```

---

## POST /employee/vacations/requests

**Purpose**: Create a new vacation request

**Authentication**: Required (JWT with Empleado role)

**Request**:
```json
{
  "start_date": "2026-03-20",
  "end_date": "2026-03-24",
  "reason": "Family trip"
}
```

**Response 201 Created**:
```json
{
  "vacation_request": {
    "id": "uuid",
    "start_date": "2026-03-20",
    "end_date": "2026-03-24",
    "requested_days": 5,
    "status": "Pendiente",
    "reason": "Family trip",
    "created_at": "2026-03-09T14:30:00Z"
  },
  "balance_after": {
    "total_days": 22,
    "used_days": 3,
    "remaining_days": 19,
    "pending_approval": 5
  },
  "message": "Vacation request created successfully. Awaiting approval."
}
```

**Request Validation**:
- `start_date` must not be in the past
- `end_date` must be >= `start_date`
- `end_date` must be within the same calendar year as `start_date`
- Reason must be non-empty (max 500 chars)
- Employee cannot have overlapping requests (Pendiente or Aprobado)
- Employee must have remaining balance > 0

**Response 400 Bad Request (Insufficient Balance)**:
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "You need 5 days, but have only 4 remaining."
  }
}
```

**Response 400 Bad Request (Invalid Dates)**:
```json
{
  "error": {
    "code": "INVALID_DATE_RANGE",
    "message": "Start date must not be in the past."
  }
}
```

**Response 409 Conflict (Overlapping Request)**:
```json
{
  "error": {
    "code": "OVERLAPPING_REQUEST",
    "message": "You already have a vacation request from 2026-03-18 to 2026-03-22."
  }
}
```

---

## PATCH /employee/vacations/requests/{request_id}

**Purpose**: Cancel an employee's pending vacation request

**Authentication**: Required (JWT with Empleado role)

**Request**:
```json
{
  "action": "cancel"
}
```

**Response 200 OK**:
```json
{
  "vacation_request": {
    "id": "uuid",
    "status": "Cancelado",
    "cancelled_at": "2026-03-09T14:35:00Z"
  },
  "balance_after": {
    "total_days": 22,
    "used_days": 3,
    "remaining_days": 19,
    "pending_approval": 0
  },
  "message": "Vacation request cancelled successfully."
}
```

**Validation**:
- Only **Pendiente** requests can be cancelled (Aprobado/Rechazado/Cancelado cannot be re-cancelled)
- Only the requesting employee can cancel (enforced at service layer)

**Response 403 Forbidden (Not Pending)**:
```json
{
  "error": {
    "code": "INVALID_STATUS",
    "message": "Only pending requests can be cancelled. Current status: Aprobado"
  }
}
```

**Response 403 Forbidden (Not Owner)**:
```json
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You can only cancel your own vacation requests."
  }
}
```

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_DATE_RANGE` | 400 | start_date > end_date or dates in past |
| `INSUFFICIENT_BALANCE` | 400 | Not enough vacation days remaining |
| `OVERLAPPING_REQUEST` | 409 | Vacation request overlaps with existing one |
| `INVALID_STATUS` | 403 | Cannot perform action on current status |
| `ACCESS_DENIED` | 403 | Employee trying to access other employee's data |
| `INVALID_YEAR` | 400 | Year out of valid range |
| `EMPLOYEE_NOT_FOUND` | 404 | Employee not found in system |

---

## Response Status Codes

| Status | Meaning |
|--------|---------|
| `Pendiente` | Request submitted, awaiting manager/admin approval |
| `Aprobado` | Request approved and confirmed |
| `Rechazado` | Request denied by manager/admin |
| `Cancelado` | Request cancelled by employee or admin |
