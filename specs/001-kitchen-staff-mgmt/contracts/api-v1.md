# API Contract: Kitchen Staff Management MVP v1

**Base URL**: `/api/v1`
**Auth**: JWT Bearer token (except `/auth/*`)
**Content-Type**: `application/json`
**Error format**: `{ "error": { "code": "ERROR_CODE", "message": "string", "details": [...] } }`

---

## Authentication

### POST /auth/login
Login with email and password.

**Request**:
```json
{
  "email": "admin@ilpi.es",
  "password": "Admin123!"
}
```

**Response 200**:
```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "admin@ilpi.es",
    "role": "Admin",
    "tenant_id": "uuid",
    "employee_id": "uuid | null"
  }
}
```
*Refresh token set as HttpOnly cookie.*

**Response 401**: `UNAUTHORIZED` — invalid credentials.

### POST /auth/refresh
Refresh access token using HttpOnly cookie.

**Response 200**: Same as login response (new access_token).
**Response 401**: `UNAUTHORIZED` — invalid/expired refresh token.

### POST /auth/logout
Invalidate refresh token.

**Response 204**: No content.

---

## Users

### GET /users
List users for the tenant. Roles: Admin only.

**Query params**: `?role=Moderador&page=1&size=20`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "email": "moderador@ilpi.es",
      "role": "Moderador",
      "employee_id": "uuid | null",
      "is_active": true,
      "created_at": "2026-02-22T10:00:00"
    }
  ],
  "total": 5,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

### POST /users
Create a new user account. Roles: Admin only.

**Request**:
```json
{
  "email": "moderador@ilpi.es",
  "password": "SecurePass123!",
  "role": "Moderador",
  "employee_id": "uuid | null"
}
```

**Response 201**: Created user object (same shape as GET item, without password).
**Response 409**: `DUPLICATE_EMAIL` — email already exists for this tenant.
**Response 422**: `VALIDATION_ERROR` — invalid fields (weak password, invalid role).

### PUT /users/{id}
Update user (change role, link employee, deactivate). Roles: Admin only.

**Request**: Partial user object (only fields to update). Password change requires `{ "password": "newpass" }`.
**Response 200**: Updated user object.
**Response 409**: `DUPLICATE_EMAIL`.

### DELETE /users/{id}
Deactivate user account (soft delete). Roles: Admin only.

**Response 200**: `{ "message": "Usuario desactivado" }`
**Response 404**: `NOT_FOUND`.

---

## Dashboard

### GET /dashboard/stats
Summary statistics. Roles: Admin, Moderador.

**Response 200**:
```json
{
  "total_employees": 25,
  "on_shift": 8,
  "on_vacation": 3,
  "pending_requests": 5
}
```

---

## Employees

### GET /employees
List active employees. Roles: Admin, Moderador. Empleado gets own profile only.

**Query params**: `?search=juan&department=Cocina&include_inactive=false&page=1&size=20`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "first_name": "Juan",
      "last_name": "García",
      "email": "juan@ilpi.es",
      "phone": "+34612345678",
      "dni": "12345678A",
      "address": "Calle Mayor 1",
      "birth_date": "1990-05-15",
      "marital_status": "Soltero/a",
      "gender": "Masculino",
      "role": "Admin",
      "department": "Dirección",
      "status": "Activo",
      "hire_date": "2024-01-15",
      "profile_image": null,
      "emergency_contact": null,
      "team_id": null,
      "is_active": true
    }
  ],
  "total": 25,
  "page": 1,
  "size": 20,
  "pages": 2
}
```

### POST /employees
Create employee. Roles: Admin.

**Request**:
```json
{
  "first_name": "María",
  "last_name": "López",
  "email": "maria@ilpi.es",
  "phone": "+34612345679",
  "dni": "87654321B",
  "address": "Calle Sol 5",
  "birth_date": "1995-03-20",
  "marital_status": "Soltero/a",
  "gender": "Femenino",
  "role": "Empleado",
  "department": "Cocina",
  "hire_date": "2025-06-01",
  "profile_image": null,
  "emergency_contact": "Pedro López +34698765432"
}
```

**Response 201**: Created employee object (same shape as GET item).
**Response 409**: `DUPLICATE_DNI` or `DUPLICATE_EMAIL` — uniqueness violation.
**Response 422**: `VALIDATION_ERROR` — invalid fields.

### GET /employees/{id}
Get single employee. Roles: Admin, Moderador, Empleado (own only).

**Response 200**: Employee object.
**Response 404**: `NOT_FOUND`.

### PUT /employees/{id}
Update employee. Roles: Admin, Moderador.

**Request**: Partial employee object (only fields to update).
**Response 200**: Updated employee object.
**Response 409**: `DUPLICATE_DNI` or `DUPLICATE_EMAIL`.

### DELETE /employees/{id}
Soft-delete employee. Roles: Admin only.

Sets `is_active = false`, `status = "Inactivo"`. Auto-rejects pending vacation requests.

**Response 200**: `{ "message": "Empleado desactivado", "rejected_requests": 2 }`
**Response 404**: `NOT_FOUND`.

---

## Teams

### GET /teams
List teams. Roles: Admin, Moderador.

**Query params**: `?department=Cocina`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Equipo A",
      "department": "Cocina",
      "shift_type": "Mañana",
      "shift_start": "09:00",
      "shift_end": "17:00",
      "members": [
        {
          "id": "uuid",
          "first_name": "Juan",
          "last_name": "García",
          "profile_image": null
        }
      ]
    }
  ]
}
```

### POST /teams
Create team. Roles: Admin, Moderador.

**Request**:
```json
{
  "name": "Equipo A",
  "department": "Cocina",
  "shift_type": "Mañana",
  "shift_start": "09:00",
  "shift_end": "17:00"
}
```

**Response 201**: Created team object.

### PUT /teams/{id}
Update team. Roles: Admin, Moderador.

### DELETE /teams/{id}
Delete team. Roles: Admin.

### POST /teams/{id}/members
Add employee to team. Roles: Admin, Moderador.

**Request**: `{ "employee_id": "uuid" }`
**Response 200**: Updated team with members.
**Response 409**: `EMPLOYEE_ON_VACATION` — employee unavailable.

### DELETE /teams/{id}/members/{employee_id}
Remove employee from team. Roles: Admin, Moderador.

**Response 204**: No content.

---

## Shifts

### GET /shifts
List shift records. Roles: Admin, Moderador. Empleado gets own only.

**Query params**: `?employee_id=uuid&date_from=2026-02-01&date_to=2026-02-28&page=1&size=20`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Juan García",
      "employee_image": null,
      "date": "2026-02-22",
      "entry_time": "2026-02-22T09:00:00",
      "exit_time": "2026-02-22T17:00:00",
      "location_lat": 38.5078,
      "location_lng": -0.2339,
      "task_label": "Cocina"
    }
  ],
  "total": 50,
  "page": 1,
  "size": 20,
  "pages": 3
}
```

### POST /shifts/clock-in
Clock in. Roles: All (own only for Empleado).

**Request**:
```json
{
  "employee_id": "uuid",
  "location_lat": 38.5078,
  "location_lng": -0.2339,
  "task_label": "Cocina"
}
```

**Response 201**: Created shift record (exit_time = null).
**Response 409**: `ACTIVE_SHIFT_EXISTS` — employee already clocked in.

### POST /shifts/{id}/clock-out
Clock out. Roles: All (own only for Empleado).

**Request**: `{ "location_lat": 38.5078, "location_lng": -0.2339 }`
**Response 200**: Updated shift record with exit_time.
**Response 404**: `NOT_FOUND` or shift already closed.

---

## Vacations

### GET /vacations
List vacation requests. Roles: Admin, Moderador. Empleado gets own only.

**Query params**: `?employee_id=uuid&status=Pendiente&page=1&size=20`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "María López",
      "employee_image": null,
      "employee_department": "Cocina",
      "start_date": "2026-03-15",
      "end_date": "2026-03-25",
      "requested_days": 11,
      "status": "Pendiente",
      "reviewed_by": null,
      "reviewed_at": null,
      "version": 1,
      "created_at": "2026-02-20T10:00:00"
    }
  ],
  "total": 10,
  "page": 1,
  "size": 20,
  "pages": 1
}
```

### POST /vacations
Create vacation request. Roles: All (own for Empleado, any for Admin/Mod).

**Request**:
```json
{
  "employee_id": "uuid",
  "start_date": "2026-03-15",
  "end_date": "2026-03-25"
}
```

**Response 201**: Created vacation request.
**Response 409**: `BALANCE_EXCEEDED` — `{ "error": { "code": "BALANCE_EXCEEDED", "message": "Saldo insuficiente. Días disponibles: 2", "details": { "available": 2, "requested": 11 } } }`
**Response 422**: `VALIDATION_ERROR` — invalid dates.

### PUT /vacations/{id}/approve
Approve request. Roles: Admin, Moderador.

**Request**: `{ "version": 1 }` (optimistic concurrency)
**Response 200**: Updated request with status "Aprobado".
**Response 409**: `CONFLICT` — version mismatch (concurrent modification).

### PUT /vacations/{id}/reject
Reject request. Roles: Admin, Moderador.

**Request**: `{ "version": 1 }`
**Response 200**: Updated request with status "Rechazado". Balance restored if was Aprobado.
**Response 409**: `CONFLICT` — version mismatch.

### PUT /vacations/{id}/cancel
Cancel own pending request. Roles: Empleado (own only), Admin, Moderador.

**Request**: `{ "version": 1 }`
**Response 200**: Updated request with status "Cancelado".
**Response 403**: `FORBIDDEN` — cannot cancel non-Pendiente requests.

### GET /vacations/balance/{employee_id}
Get vacation balance. Roles: All (own for Empleado).

**Query params**: `?year=2026`

**Response 200**:
```json
{
  "employee_id": "uuid",
  "year": 2026,
  "total_days": 30,
  "used_days": 10,
  "remaining_days": 20
}
```

---

## Reports

### GET /reports/hours-by-day
Hours worked grouped by day of week. Roles: Admin, Moderador.

**Query params**: `?date_from=2026-02-01&date_to=2026-02-28`

**Response 200**:
```json
{
  "data": [
    { "day": "Lunes", "hours": 45.5 },
    { "day": "Martes", "hours": 42.0 }
  ]
}
```

### GET /reports/department-distribution
Employee distribution by department. Roles: Admin, Moderador.

**Response 200**:
```json
{
  "data": [
    { "department": "Cocina", "count": 10 },
    { "department": "Barra", "count": 5 }
  ]
}
```

---

## Common Headers

**Request**:
- `Authorization: Bearer <access_token>` (all except `/auth/*`)
- `Content-Type: application/json`

**Response**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Rate Limits

- Auth endpoints: 10 requests/minute per IP
- All other endpoints: 100 requests/minute per user
- Response header: `X-RateLimit-Remaining`, `X-RateLimit-Reset`
