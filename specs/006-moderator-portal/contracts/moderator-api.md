# API Contracts: Moderator Portal (Feature 006)

**Date**: 2026-03-09
**Phase**: 1 - Design & Contracts
**Status**: Complete
**Base URL**: `/api/v1/moderator`
**Authentication**: JWT Bearer token (required on all endpoints)
**Authorization**: `require_role_and_active("Moderador")` applied to all endpoints

---

## Overview

All moderator endpoints enforce department-scoped access at the service layer. Moderators can only view/manage employees in their assigned department. This contract defines the REST API endpoints, request/response schemas, error codes, and validation rules.

---

## Endpoints

### 1. Shift Roster / Calendar

#### 1.1 Get Team Shift Roster for Month

**Request**:
```
GET /api/v1/moderator/roster?year=2026&month=3
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `year` (int, required): 4-digit year
- `month` (int, required): 1-12
- `department_filter` (string, optional): Further filter by department within moderator's own dept (IGNORED; always uses moderator's dept)

**Response** (200 OK):
```json
{
  "year": 2026,
  "month": 3,
  "department": "Cocina",
  "shifts": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Carlos Rodríguez",
      "date": "2026-03-10",
      "shift_type_id": "uuid",
      "shift_type_name": "Mañana",
      "entry_time": null,
      "exit_time": null,
      "vacation_status": null
    },
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "María González",
      "date": "2026-03-10",
      "shift_type_id": "uuid",
      "shift_type_name": "Noche",
      "entry_time": null,
      "exit_time": null,
      "vacation_status": "Aprobado"  // Employee has approved vacation this day
    }
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid month/year
  ```json
  {"detail": {"error": {"code": "INVALID_DATE", "message": "Mes debe estar entre 1-12"}}}
  ```
- `401 Unauthorized`: Invalid/expired JWT
- `403 Forbidden`: User is not Moderador role

---

#### 1.2 Get Shift Details for a Date

**Request**:
```
GET /api/v1/moderator/shifts?date=2026-03-10
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `date` (string, required): YYYY-MM-DD format

**Response** (200 OK):
```json
{
  "date": "2026-03-10",
  "shifts": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Carlos Rodríguez",
      "shift_type_name": "Mañana",
      "shift_type": {
        "id": "uuid",
        "time_windows": [{"start": "10:30", "end": "18:00"}],
        "expected_hours": 7.5
      },
      "vacation_status": null
    }
  ]
}
```

---

### 2. Vacation Request Management

#### 2.1 List Pending Vacation Requests

**Request**:
```
GET /api/v1/moderator/vacations/pending
Authorization: Bearer {access_token}
```

**Query Parameters** (optional):
- `status` (string): Filter by status (Pendiente, Aprobado, Rechazado, Cancelado)
- `employee_id` (string): Filter by specific employee
- `date_from` (string, YYYY-MM-DD): Filter by start date range
- `date_to` (string, YYYY-MM-DD): Filter by end date range

**Response** (200 OK):
```json
{
  "requests": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Carlos Rodríguez",
      "department": "Cocina",
      "start_date": "2026-03-15",
      "end_date": "2026-03-17",
      "requested_days": 3,
      "status": "Pendiente",
      "created_at": "2026-03-09T10:30:00Z",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": null
    }
  ],
  "count": 1,
  "total": 5
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid JWT
- `403 Forbidden`: User is not Moderador

---

#### 2.2 Get Vacation Request Details

**Request**:
```
GET /api/v1/moderator/vacations/{request_id}
Authorization: Bearer {access_token}
```

**Path Parameters**:
- `request_id` (uuid): Vacation request ID

**Response** (200 OK):
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee": {
    "name": "Carlos Rodríguez",
    "department": "Cocina",
    "hire_date": "2024-06-01"
  },
  "start_date": "2026-03-15",
  "end_date": "2026-03-17",
  "requested_days": 3,
  "status": "Pendiente",
  "balance": {
    "year": 2026,
    "total_days": 30,
    "used_days": 5,
    "remaining_days": 25
  },
  "created_at": "2026-03-09T10:30:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Request does not exist or is in different department
  ```json
  {"detail": {"error": {"code": "NOT_FOUND", "message": "Solicitud de vacaciones no encontrada"}}}
  ```

---

#### 2.3 Approve Vacation Request

**Request**:
```
POST /api/v1/moderator/vacations/{request_id}/approve
Content-Type: application/json
Authorization: Bearer {access_token}

{}
```

**Request Body**: Empty

**Response** (200 OK):
```json
{
  "id": "uuid",
  "status": "Aprobado",
  "reviewed_by": "moderador-user-id",
  "reviewed_at": "2026-03-09T14:00:00Z",
  "message": "Solicitud de vacaciones aprobada"
}
```

**Error Responses**:
- `400 Bad Request`: Request not in Pendiente status
  ```json
  {"detail": {"error": {"code": "INVALID_STATUS", "message": "Solo se pueden aprobar solicitudes pendientes"}}}
  ```
- `404 Not Found`: Request not found or wrong department
- `401 Unauthorized`: Invalid JWT

---

#### 2.4 Reject Vacation Request

**Request**:
```
POST /api/v1/moderator/vacations/{request_id}/reject
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "reason": "Necesitamos cobertura esa semana"  // Optional
}
```

**Request Body**:
```json
{
  "reason": "string (optional)"
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "status": "Rechazado",
  "reviewed_by": "moderador-user-id",
  "reviewed_at": "2026-03-09T14:00:00Z",
  "rejection_reason": "Necesitamos cobertura esa semana",
  "message": "Solicitud de vacaciones rechazada"
}
```

---

### 3. Shift Assignment

#### 3.1 Assign Shift to Employee

**Request**:
```
POST /api/v1/moderator/shifts/assign
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "employee_id": "uuid",
  "date": "2026-03-15",
  "shift_type_id": "uuid"
}
```

**Request Body**:
- `employee_id` (uuid, required): Employee to assign
- `date` (string, required): YYYY-MM-DD
- `shift_type_id` (uuid, required): Shift type to assign

**Response** (201 Created):
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "Carlos Rodríguez",
  "date": "2026-03-15",
  "shift_type_name": "Mañana",
  "message": "Turno asignado exitosamente"
}
```

**Error Responses**:
- `400 Bad Request - EMPLOYEE_NOT_IN_DEPARTMENT`: Employee not in moderator's department
  ```json
  {"detail": {"error": {"code": "EMPLOYEE_NOT_IN_DEPARTMENT", "message": "El empleado no pertenece a tu departamento"}}}
  ```
- `400 Bad Request - VACATION_CONFLICT`: Employee has approved vacation on that date
  ```json
  {"detail": {"error": {"code": "VACATION_CONFLICT", "message": "El empleado tiene vacaciones aprobadas en esta fecha"}}}
  ```
- `400 Bad Request - SHIFT_EXISTS`: Employee already has shift on that date
  ```json
  {"detail": {"error": {"code": "SHIFT_EXISTS", "message": "El empleado ya tiene un turno asignado para esta fecha. ¿Deseas reemplazarlo?"}}}
  ```
- `404 Not Found`: Shift type doesn't exist
- `401 Unauthorized`: Invalid JWT

---

#### 3.2 Replace Existing Shift

**Request**:
```
PUT /api/v1/moderator/shifts/{shift_id}
Content-Type: application/json
Authorization: Bearer {access_token}

{
  "shift_type_id": "uuid"
}
```

**Request Body**:
- `shift_type_id` (uuid, required): New shift type

**Response** (200 OK):
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "date": "2026-03-15",
  "shift_type_name": "Noche",
  "message": "Turno actualizado"
}
```

---

#### 3.3 Delete Shift Assignment

**Request**:
```
DELETE /api/v1/moderator/shifts/{shift_id}
Authorization: Bearer {access_token}
```

**Response** (204 No Content)

**Error Responses**:
- `400 Bad Request`: Shift already worked (entry_time set); cannot delete
  ```json
  {"detail": {"error": {"code": "SHIFT_WORKED", "message": "No se puede eliminar un turno que ya se ha registrado"}}}
  ```
- `404 Not Found`: Shift not found or wrong department
- `401 Unauthorized`: Invalid JWT

---

### 4. Reports & Analytics

#### 4.1 Get Vacation Summary

**Request**:
```
GET /api/v1/moderator/reports/vacations?year=2026
Authorization: Bearer {access_token}
```

**Query Parameters** (optional):
- `year` (int): Filter by year (default: current year)
- `status` (string): Filter by status (Aprobado, Rechazado, Pendiente)

**Response** (200 OK):
```json
{
  "year": 2026,
  "department": "Cocina",
  "summary": [
    {
      "employee_id": "uuid",
      "employee_name": "Carlos Rodríguez",
      "approved_days": 10,
      "rejected_days": 2,
      "pending_days": 0,
      "remaining_days": 20
    }
  ],
  "department_total": {
    "approved_days": 35,
    "rejected_days": 5,
    "pending_days": 3
  }
}
```

---

#### 4.2 Get Attendance Report

**Request**:
```
GET /api/v1/moderator/reports/attendance?date_from=2026-03-01&date_to=2026-03-31
Authorization: Bearer {access_token}
```

**Query Parameters**:
- `date_from` (string, YYYY-MM-DD, required)
- `date_to` (string, YYYY-MM-DD, required)

**Response** (200 OK):
```json
{
  "date_from": "2026-03-01",
  "date_to": "2026-03-31",
  "department": "Cocina",
  "records": [
    {
      "employee_id": "uuid",
      "employee_name": "Carlos Rodríguez",
      "date": "2026-03-10",
      "clock_in": "10:32",
      "clock_out": "18:05",
      "hours_worked": 7.55,
      "shift_type": "Mañana"
    }
  ]
}
```

---

## Error Response Format

All errors follow the standard format:

```json
{
  "detail": {
    "error": {
      "code": "ERROR_CODE",        // Machine-readable code
      "message": "Error message"   // Human-readable Spanish message
    },
    "context": {
      "employee_id": "uuid",       // Optional context for debugging
      "request_id": "uuid"
    }
  }
}
```

**Common Error Codes**:
- `INVALID_DATE`: Date format error
- `EMPLOYEE_NOT_IN_DEPARTMENT`: Cross-department access attempted
- `VACATION_CONFLICT`: Shift conflicts with vacation
- `SHIFT_EXISTS`: Duplicate shift on same date
- `SHIFT_WORKED`: Cannot modify/delete worked shift
- `INSUFFICIENT_BALANCE`: Not enough vacation days
- `NOT_FOUND`: Resource doesn't exist
- `INVALID_STATUS`: Cannot transition status
- `UNAUTHORIZED`: Missing/invalid JWT
- `FORBIDDEN`: Insufficient permissions (not Moderador role)

---

## Request/Response Schemas

### VacationRequest DTO
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "string",
  "department": "string",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD",
  "requested_days": "int",
  "status": "Pendiente|Aprobado|Rechazado|Cancelado",
  "created_at": "ISO8601",
  "reviewed_by": "uuid|null",
  "reviewed_at": "ISO8601|null",
  "rejection_reason": "string|null"
}
```

### ShiftRecord DTO
```json
{
  "id": "uuid",
  "employee_id": "uuid",
  "employee_name": "string",
  "date": "YYYY-MM-DD",
  "shift_type_id": "uuid",
  "shift_type_name": "string",
  "entry_time": "HH:MM|null",
  "exit_time": "HH:MM|null",
  "vacation_status": "Aprobado|Rechazado|null"
}
```

### ShiftType DTO
```json
{
  "id": "uuid",
  "name": "string",
  "type": "MAÑANA|NOCHE|CORTADO|CORRIDO",
  "time_windows": [{"start": "HH:MM", "end": "HH:MM"}],
  "expected_hours": "float"
}
```

---

## Authentication & Authorization

**Header**:
```
Authorization: Bearer {access_token}
```

**JWT Payload** (required claims):
```json
{
  "sub": "user-id",
  "tenant_id": "tenant-uuid",
  "role": "Moderador",
  "employee_id": "employee-uuid",
  "exp": 1234567890
}
```

**All endpoints**:
- Require role = "Moderador"
- Enforce department scoping at service layer
- Verify employee_id in JWT (must be moderator's own employee)

---

## Rate Limiting

- Standard endpoints: 100 requests/minute
- Auth endpoints: 10 requests/minute (inherited from `/auth/login`)

---

## Testing Checklist

- [ ] Moderador can view only own department shifts
- [ ] Moderador cannot assign shift to employee in different dept (400 EMPLOYEE_NOT_IN_DEPARTMENT)
- [ ] Moderador cannot assign shift during approved vacation (400 VACATION_CONFLICT)
- [ ] Moderador can replace existing shift with confirmation
- [ ] Moderador can approve pending request (sets reviewed_by, reviewed_at)
- [ ] Approved vacation immediately blocks shift assignments
- [ ] Moderador can reject request with optional reason
- [ ] Reports correctly aggregate by employee and department
- [ ] Attendance records show only working shifts (with entry_time)
- [ ] All timestamps are in UTC; dates are YYYY-MM-DD
- [ ] Cross-tenant access is impossible (tenant_id filter on all queries)
