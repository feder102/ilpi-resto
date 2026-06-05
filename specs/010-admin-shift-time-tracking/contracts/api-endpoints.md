# API Contract: Admin-Driven Shift Hours & Extra Hours

**Feature**: 010-admin-shift-time-tracking
**Base prefix**: `/api/v1`

---

## Removed Endpoints

These endpoints are deleted (now return 404):

| Method | Path | Was |
|--------|------|-----|
| POST | `/employee/time-tracking/clock-in` | Employee manual clock-in |
| POST | `/employee/time-tracking/clock-out` | Employee manual clock-out |
| GET | `/employee/time-tracking/today` | Employee clock status |
| GET | `/employee/time-tracking/records` | Employee `TimeRecord` list |
| POST | `/shifts/clock-in` | Legacy admin clock-in on `ShiftRecord` |
| POST | `/shifts/{shift_id}/clock-out` | Legacy admin clock-out on `ShiftRecord` |

---

## New Endpoint: Create Extra Hours

`POST /employee/time-tracking/extra-hours` — **Admin/Moderador only**

Request body (`ExtraHoursCreate`):
```json
{
  "employee_id": "uuid",
  "work_date": "2026-06-05",
  "hours": 3.5,
  "note": "Cobertura por ausencia"
}
```

Validation:
- `hours`: `> 0` and `<= 24` → 400 on violation.
- `employee_id`: must exist and belong to the caller's tenant → 404 otherwise.
- Caller role ∈ {Admin, Moderador} → 403 otherwise.

Response `201` (`TimeEntryResponse`):
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "Juan Pérez",
  "employee_dni": "12345678",
  "shift_date": "2026-06-05",
  "start_time": null,
  "end_time": null,
  "hours_worked": "3.50",
  "source": "extra",
  "shift_type_id": null,
  "created_at": "2026-06-05T12:00:00Z"
}
```

Side effect: audit log entry (`action="create_extra_hours"`, actor, target employee, hours).

---

## New Endpoint (optional): Delete Extra Hours

`DELETE /employee/time-tracking/extra-hours/{entry_id}` — **Admin/Moderador only**

- Only deletes entries with `source = "extra"` (never shift entries) → 404/400 otherwise.
- Response `204`. Audit log (`action="delete_extra_hours"`).

---

## Modified Responses (statistics)

Both employee and admin statistics now surface extra hours separately:

`GET /employee/time-tracking/statistics?year&month` (Empleado, read-only) — `EmployeeStatisticsPublicResponse`:
```json
{
  "total_hours": 43.5,
  "extra_hours": 3.5,
  "weekly_breakdown": [ ... ],
  "daily_records": [ ... ]
}
```
`total_hours` includes shift + extra; `extra_hours` is the overtime portion.

`GET /employee/time-tracking/statistics/employee/{id}?year&month` (Admin/Moderador) — `EmployeeStatisticsResponse` adds `extra_hours`.

`GET /employee/time-tracking/entries?...&source=extra` (Admin/Moderador) — the `source` filter accepts `shift` | `manual` | `extra`.
