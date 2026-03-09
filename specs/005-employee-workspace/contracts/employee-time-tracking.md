# API Contract: Employee Time Tracking

**Feature**: 005-employee-workspace | **Endpoints**: Clock in/out, Time records list

---

## POST /employee/time-tracking/clock-in

**Purpose**: Employee clocks in for their shift

**Authentication**: Required (JWT with Empleado role)

**Request**: No body required

**Response 201 Created**:
```json
{
  "time_record": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2026-03-09",
    "clock_in_timestamp": "2026-03-09T08:30:15Z",
    "clock_out_timestamp": null
  },
  "status": "clocked-in",
  "message": "Clocked in successfully at 08:30 AM"
}
```

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "NO_SHIFT_TODAY",
    "message": "You have no shift scheduled for today."
  }
}
```

**Response 409 Conflict**:
```json
{
  "error": {
    "code": "ALREADY_CLOCKED_IN",
    "message": "You are already clocked in. Please clock out first."
  }
}
```

---

## POST /employee/time-tracking/clock-out

**Purpose**: Employee clocks out from their shift

**Authentication**: Required (JWT with Empleado role)

**Request**: No body required

**Response 200 OK**:
```json
{
  "time_record": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2026-03-09",
    "clock_in_timestamp": "2026-03-09T08:30:15Z",
    "clock_out_timestamp": "2026-03-09T17:30:42Z"
  },
  "status": "clocked-out",
  "summary": {
    "total_hours": 9.00,
    "total_minutes": 540,
    "formatted": "9h 0m",
    "clock_in": "08:30 AM",
    "clock_out": "05:30 PM"
  },
  "message": "Clocked out successfully at 05:30 PM"
}
```

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "NOT_CLOCKED_IN",
    "message": "You are not clocked in. Please clock in first."
  }
}
```

---

## GET /employee/time-tracking/records

**Purpose**: Get employee's time records for a date range

**Authentication**: Required (JWT with Empleado role)

**Query Parameters**:
- `date_from`: "YYYY-MM-DD" (optional, default: 30 days ago)
- `date_to`: "YYYY-MM-DD" (optional, default: today)
- `page`: int (optional, default: 1)
- `size`: int (optional, default: 20, max: 100)

**Response 200 OK**:
```json
{
  "items": [
    {
      "id": "uuid",
      "date": "2026-03-09",
      "clock_in_timestamp": "2026-03-09T08:30:15Z",
      "clock_out_timestamp": "2026-03-09T17:30:42Z",
      "total_hours": 9.00,
      "status": "completed"
    },
    {
      "id": "uuid",
      "date": "2026-03-08",
      "clock_in_timestamp": "2026-03-08T08:00:00Z",
      "clock_out_timestamp": "2026-03-08T17:00:00Z",
      "total_hours": 9.00,
      "status": "completed"
    }
  ],
  "total": 45,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

**Filters Applied**: Only current employee's records (enforced at service layer)

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `NO_SHIFT_TODAY` | 400 | No shift assigned for today |
| `ALREADY_CLOCKED_IN` | 409 | Employee is already clocked in |
| `NOT_CLOCKED_IN` | 400 | Employee is not clocked in |
| `FUTURE_TIMESTAMP` | 400 | Cannot use future time |
| `INVALID_DATE_RANGE` | 400 | date_from > date_to |

---

## Response Status Codes

| Status | Meaning |
|--------|---------|
| `clocked-in` | Currently clocked in, awaiting clock-out |
| `clocked-out` | Successfully clocked out |
| `completed` | Record is finalized (clock_out_timestamp exists) |
