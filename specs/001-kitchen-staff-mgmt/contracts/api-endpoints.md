# API Contracts: Kitchen Staff Management MVP

**Branch**: `001-kitchen-staff-mgmt` | **Date**: 2026-02-22
**Base URL**: `/api/v1`

## Common Schemas

### ErrorResponse
```json
{
  "error": {
    "code": "string (e.g., VALIDATION_ERROR, NOT_FOUND, FORBIDDEN)",
    "message": "string (human-readable, Spanish)",
    "details": [
      {
        "field": "string (field name, optional)",
        "message": "string (field-specific error)"
      }
    ]
  }
}
```

### PaginatedResponse
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 20,
  "pages": 1
}
```

## Authentication

### POST /auth/register
Create a new user account.
- **Auth**: Admin only
- **Request**:
  ```json
  {
    "email": "string (required, valid email)",
    "password": "string (required, min 8 chars)",
    "role": "Admin | Moderador | Empleado",
    "employee_id": "UUID (optional, link to employee)"
  }
  ```
- **Response 201**:
  ```json
  {
    "id": "UUID",
    "email": "string",
    "role": "string",
    "employee_id": "UUID | null"
  }
  ```
- **Errors**: 400 (validation), 409 (email exists), 403 (not admin)

### POST /auth/login
Authenticate and receive tokens.
- **Auth**: Public
- **Rate limit**: 10 req/min per IP
- **Request**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response 200**:
  ```json
  {
    "access_token": "string (JWT, 30 min)",
    "token_type": "bearer",
    "user": {
      "id": "UUID",
      "email": "string",
      "role": "string",
      "employee_id": "UUID | null"
    }
  }
  ```
  - Refresh token set as httpOnly cookie
- **Errors**: 401 (invalid credentials, generic message)

### POST /auth/refresh
Refresh the access token using the httpOnly refresh cookie.
- **Auth**: Refresh cookie required
- **Response 200**:
  ```json
  {
    "access_token": "string (new JWT)",
    "token_type": "bearer"
  }
  ```
- **Errors**: 401 (invalid/expired refresh token)

### POST /auth/logout
Invalidate the refresh token.
- **Auth**: Authenticated
- **Response 204**: No content
- Clears refresh cookie

### GET /auth/me
Get the current authenticated user.
- **Auth**: Authenticated
- **Response 200**:
  ```json
  {
    "id": "UUID",
    "email": "string",
    "role": "string",
    "employee_id": "UUID | null",
    "tenant": {
      "id": "UUID",
      "name": "string",
      "slug": "string"
    }
  }
  ```

## Employees

### GET /employees
List employees (filtered, paginated).
- **Auth**: Admin, Moderador
- **Query params**: `page`, `page_size`, `search` (name/DNI),
  `department`, `status`, `is_active` (default true)
- **Response 200**: PaginatedResponse of EmployeeResponse
  ```json
  {
    "id": "UUID",
    "first_name": "string",
    "last_name": "string",
    "email": "string",
    "phone": "string | null",
    "dni": "string",
    "address": "string | null",
    "birth_date": "date | null",
    "marital_status": "string | null",
    "gender": "string | null",
    "role": "string",
    "department": "string",
    "status": "string",
    "hire_date": "date",
    "profile_image": "string | null",
    "emergency_contact": "string | null",
    "is_active": true,
    "team_id": "UUID | null"
  }
  ```

### POST /employees
Create a new employee.
- **Auth**: Admin only
- **Request**:
  ```json
  {
    "first_name": "string (required, max 100)",
    "last_name": "string (required, max 100)",
    "email": "string (required, valid email)",
    "phone": "string (optional)",
    "dni": "string (required, max 20)",
    "address": "string (optional)",
    "birth_date": "date (optional)",
    "marital_status": "string (optional, enum)",
    "gender": "string (optional, enum)",
    "role": "string (required, enum)",
    "department": "string (required, enum)",
    "hire_date": "date (required)",
    "profile_image": "string (optional, URL)",
    "emergency_contact": "string (optional)"
  }
  ```
- **Response 201**: EmployeeResponse
- **Errors**: 400 (validation), 409 (DNI/email duplicate), 403

### GET /employees/{id}
Get a single employee by ID.
- **Auth**: Admin, Moderador, or self (Empleado viewing own profile)
- **Response 200**: EmployeeResponse
- **Errors**: 404, 403

### PUT /employees/{id}
Update an employee.
- **Auth**: Admin, Moderador (no delete permission)
- **Request**: Same as POST (all fields optional for partial update)
- **Response 200**: EmployeeResponse
- **Errors**: 400, 404, 409 (DNI/email duplicate), 403

### DELETE /employees/{id}
Soft-delete an employee (set is_active=false, status=Inactivo).
- **Auth**: Admin only
- **Response 200**:
  ```json
  {
    "message": "Empleado desactivado correctamente",
    "pending_vacations_rejected": 2
  }
  ```
- **Errors**: 404, 403
- **Side effects**: All Pendiente vacation requests auto-rejected.

## Vacations

### GET /vacations
List vacation requests (filtered, paginated).
- **Auth**: Admin, Moderador (all requests); Empleado (own only)
- **Query params**: `page`, `page_size`, `employee_id`, `status`, `year`
- **Response 200**: PaginatedResponse of VacationResponse
  ```json
  {
    "id": "UUID",
    "employee_id": "UUID",
    "employee_name": "string",
    "employee_department": "string",
    "employee_profile_image": "string | null",
    "start_date": "date",
    "end_date": "date",
    "requested_days": 5,
    "status": "Pendiente",
    "reviewed_by": "UUID | null",
    "reviewed_at": "datetime | null",
    "version": 1,
    "created_at": "datetime"
  }
  ```

### POST /vacations
Create a vacation request.
- **Auth**: Authenticated (employee creates own; admin/mod for any)
- **Request**:
  ```json
  {
    "employee_id": "UUID (required)",
    "start_date": "date (required)",
    "end_date": "date (required)"
  }
  ```
- **Response 201**: VacationResponse
- **Validation**: Rejects if `requested_days > remaining_days` with
  error: `"Saldo insuficiente. Días disponibles: {remaining}"`
- **Errors**: 400 (validation, insufficient balance), 403, 404

### PATCH /vacations/{id}/approve
Approve a pending vacation request.
- **Auth**: Admin, Moderador
- **Request**:
  ```json
  {
    "version": 1
  }
  ```
- **Response 200**: VacationResponse (status=Aprobado)
- **Side effects**: VacationBalance.used_days incremented.
- **Errors**: 400 (not pending), 404, 409 (version conflict), 403

### PATCH /vacations/{id}/reject
Reject a vacation request (pending or approved).
- **Auth**: Admin, Moderador
- **Request**:
  ```json
  {
    "version": 1
  }
  ```
- **Response 200**: VacationResponse (status=Rechazado)
- **Side effects**: If was Aprobado, VacationBalance.used_days
  decremented.
- **Errors**: 400 (already rejected/cancelled), 404, 409, 403

### PATCH /vacations/{id}/cancel
Employee cancels their own pending request.
- **Auth**: Empleado (own request only)
- **Request**:
  ```json
  {
    "version": 1
  }
  ```
- **Response 200**: VacationResponse (status=Cancelado)
- **Errors**: 400 (not pending), 403 (not own request), 404, 409

### GET /vacations/balance/{employee_id}
Get vacation balance for an employee.
- **Auth**: Admin, Moderador, or self
- **Query params**: `year` (default current year)
- **Response 200**:
  ```json
  {
    "employee_id": "UUID",
    "year": 2026,
    "total_days": 30,
    "used_days": 10,
    "remaining_days": 20
  }
  ```

## Shifts

### GET /shifts
List shift records (filtered, paginated).
- **Auth**: Admin, Moderador (all); Empleado (own only)
- **Query params**: `page`, `page_size`, `employee_id`, `date_from`,
  `date_to`, `active_only` (exit_time IS NULL)
- **Response 200**: PaginatedResponse of ShiftResponse
  ```json
  {
    "id": "UUID",
    "employee_id": "UUID",
    "employee_name": "string",
    "employee_department": "string",
    "employee_profile_image": "string | null",
    "date": "date",
    "entry_time": "datetime",
    "exit_time": "datetime | null",
    "location_lat": "float | null",
    "location_lng": "float | null",
    "task_label": "string | null"
  }
  ```

### POST /shifts/clock-in
Clock in an employee.
- **Auth**: Authenticated
- **Request**:
  ```json
  {
    "employee_id": "UUID (required)",
    "location_lat": "float (optional)",
    "location_lng": "float (optional)",
    "task_label": "string (optional)"
  }
  ```
- **Response 201**: ShiftResponse
- **Validation**: Rejects if employee has an active (unclosed) shift.
- **Errors**: 400 (active shift exists), 403, 404

### PATCH /shifts/{id}/clock-out
Clock out from an active shift.
- **Auth**: Authenticated (own shift or admin)
- **Request**:
  ```json
  {
    "location_lat": "float (optional)",
    "location_lng": "float (optional)"
  }
  ```
- **Response 200**: ShiftResponse (with exit_time set)
- **Errors**: 400 (already clocked out), 403, 404

## Teams

### GET /teams
List teams (filtered by department).
- **Auth**: Admin, Moderador
- **Query params**: `department`
- **Response 200**: List of TeamResponse
  ```json
  {
    "id": "UUID",
    "name": "string",
    "department": "string",
    "shift_type": "string",
    "shift_start": "time",
    "shift_end": "time",
    "members": [
      {
        "id": "UUID",
        "first_name": "string",
        "last_name": "string",
        "profile_image": "string | null"
      }
    ]
  }
  ```

### POST /teams
Create a new team.
- **Auth**: Admin only
- **Request**:
  ```json
  {
    "name": "string (required)",
    "department": "string (required, enum)",
    "shift_type": "string (required)",
    "shift_start": "time (required, HH:MM)",
    "shift_end": "time (required, HH:MM)"
  }
  ```
- **Response 201**: TeamResponse
- **Errors**: 400, 409 (duplicate name+dept), 403

### PUT /teams/{id}
Update a team.
- **Auth**: Admin only
- **Request**: Same as POST (partial update)
- **Response 200**: TeamResponse

### POST /teams/{id}/members
Add an employee to a team.
- **Auth**: Admin, Moderador
- **Request**:
  ```json
  {
    "employee_id": "UUID"
  }
  ```
- **Response 200**: TeamResponse (updated members)
- **Validation**: Employee must be in same department. Employee must
  not be on approved vacation for current date.
- **Errors**: 400 (wrong department, on vacation), 404, 409 (already member)

### DELETE /teams/{id}/members/{employee_id}
Remove an employee from a team.
- **Auth**: Admin, Moderador
- **Response 204**: No content
- **Errors**: 404

## Dashboard

### GET /dashboard/stats
Get dashboard summary statistics.
- **Auth**: Admin, Moderador
- **Response 200**:
  ```json
  {
    "total_employees": 25,
    "on_shift": 8,
    "on_vacation": 3,
    "pending_requests": 5
  }
  ```

### GET /dashboard/today-shifts
Get today's shift schedule.
- **Auth**: Admin, Moderador
- **Query params**: `limit` (default 5)
- **Response 200**: List of ShiftResponse (today's records)
