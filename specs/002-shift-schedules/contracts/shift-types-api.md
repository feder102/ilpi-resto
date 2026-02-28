# API Contract: Shift Types Endpoints

**Feature**: `002-shift-schedules` | **Date**: 2026-02-28 | **Scope**: Admin shift type configuration

---

## Endpoint Summary

| Method | Path | RBAC | Purpose |
|--------|------|------|---------|
| GET | `/shift-types` | Admin, Moderador | List all shift types |
| GET | `/shift-types/{id}` | Admin, Moderador | Get single shift type details |
| POST | `/shift-types` | Admin, Moderador | Create new shift type |
| PUT | `/shift-types/{id}` | Admin, Moderador | Update shift type |
| DELETE | `/shift-types/{id}` | Admin | Delete shift type (soft) |

---

## GET /shift-types

### Purpose
List all shift types for the tenant, paginated.

### Request

**Method**: GET
**Path**: `/shift-types`
**Headers**:
- `Authorization: Bearer <access_token>`

**Query Parameters**:
| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | — | Page number (1-indexed) |
| `size` | integer | 20 | 100 | Results per page |
| `active_only` | boolean | true | — | Filter to active shift types only |
| `type` | string | — | — | Filter by shift type enum (MAÑANA, NOCHE, etc) |

**Example**:
```bash
GET /shift-types?page=1&size=20&active_only=true
Authorization: Bearer eyJhbGc...
```

### Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Mañana",
      "type": "MAÑANA",
      "time_windows": [
        {
          "start": "10:30",
          "end": "18:00"
        }
      ],
      "uses_dynamic_close": false,
      "expected_hours": 7.5,
      "total_hours": 7.5,
      "description": "Morning shift",
      "is_active": true,
      "created_at": "2026-02-28T10:30:00Z",
      "updated_at": "2026-02-28T10:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Cortado",
      "type": "CORTADO",
      "time_windows": [
        {
          "start": "12:30",
          "end": "16:30"
        },
        {
          "start": "18:30",
          "end": "22:30"
        }
      ],
      "uses_dynamic_close": false,
      "expected_hours": 8.0,
      "total_hours": 8.0,
      "description": "Split shift with lunch break",
      "is_active": true,
      "created_at": "2026-02-28T11:00:00Z",
      "updated_at": "2026-02-28T11:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 4,
  "pages": 1
}
```

### Error Responses

**401 Unauthorized** (missing/invalid token):
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing authentication token"
  }
}
```

**403 Forbidden** (insufficient role):
```json
{
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Admin or Moderador role required"
  }
}
```

---

## GET /shift-types/{id}

### Purpose
Retrieve full details of a specific shift type.

### Request

**Method**: GET
**Path**: `/shift-types/{id}`
**Path Parameters**:
- `id` (UUID): Shift type ID

**Headers**:
- `Authorization: Bearer <access_token>`

**Example**:
```bash
GET /shift-types/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGc...
```

### Response

**Status Code**: `200 OK`

**Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {
      "start": "12:30",
      "end": "16:30"
    },
    {
      "start": "18:30",
      "end": "22:30"
    }
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "total_hours": 8.0,
  "description": "Split shift with lunch break",
  "is_active": true,
  "created_at": "2026-02-28T11:00:00Z",
  "updated_at": "2026-02-28T11:00:00Z",
  "_teams_using": 3
}
```

**Note**: `_teams_using` field (informational) shows how many teams are assigned this shift type.

### Error Responses

**404 Not Found** (shift type doesn't exist):
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Shift type not found"
  }
}
```

---

## POST /shift-types

### Purpose
Create a new shift type. Admins define the standard shift definitions for their organization.

### Request

**Method**: POST
**Path**: `/shift-types`

**Headers**:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Body**:
```json
{
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {
      "start": "12:30",
      "end": "16:30"
    },
    {
      "start": "18:30",
      "end": "22:30"
    }
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "description": "Split shift with 2-hour lunch break"
}
```

**Field Requirements**:

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `name` | string | Yes | 1-100 chars, unique per tenant, alphanumeric + spaces/hyphens |
| `type` | enum | Yes | One of: MAÑANA, NOCHE, CORTADO, CORRIDO |
| `time_windows` | array | Yes | 1-3 windows, each {start, end} in HH:MM format |
| `uses_dynamic_close` | boolean | No | Default false; true for Noche/Corrido |
| `expected_hours` | number | Yes | 0.5-24.0 decimal |
| `description` | string | No | 0-500 chars |

### Response

**Status Code**: `201 Created`

**Body**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cortado",
  "type": "CORTADO",
  "time_windows": [
    {
      "start": "12:30",
      "end": "16:30"
    },
    {
      "start": "18:30",
      "end": "22:30"
    }
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.0,
  "total_hours": 8.0,
  "description": "Split shift with 2-hour lunch break",
  "is_active": true,
  "created_at": "2026-02-28T14:15:00Z",
  "updated_at": "2026-02-28T14:15:00Z"
}
```

**Location Header**: `Location: /shift-types/550e8400-e29b-41d4-a716-446655440003`

### Error Responses

**400 Bad Request** (validation error):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": {
      "name": "Must be 1-100 characters",
      "expected_hours": "Must match calculated hours (tolerance: ±0.01)"
    }
  }
}
```

**409 Conflict** (duplicate name):
```json
{
  "error": {
    "code": "DUPLICATE_NAME",
    "message": "Shift type 'Cortado' already exists for this tenant"
  }
}
```

**403 Forbidden** (insufficient role):
```json
{
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Admin or Moderador role required for shift type creation"
  }
}
```

---

## PUT /shift-types/{id}

### Purpose
Update an existing shift type configuration.

### Request

**Method**: PUT
**Path**: `/shift-types/{id}`

**Headers**:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Body** (all fields optional, only provided fields are updated):
```json
{
  "name": "Cortado Premium",
  "time_windows": [
    {
      "start": "12:00",
      "end": "16:30"
    },
    {
      "start": "18:30",
      "end": "22:30"
    }
  ],
  "expected_hours": 8.5,
  "description": "Updated shift definition"
}
```

### Response

**Status Code**: `200 OK`

**Body** (full updated shift type):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cortado Premium",
  "type": "CORTADO",
  "time_windows": [
    {
      "start": "12:00",
      "end": "16:30"
    },
    {
      "start": "18:30",
      "end": "22:30"
    }
  ],
  "uses_dynamic_close": false,
  "expected_hours": 8.5,
  "total_hours": 8.5,
  "description": "Updated shift definition",
  "is_active": true,
  "created_at": "2026-02-28T14:15:00Z",
  "updated_at": "2026-02-28T14:45:00Z"
}
```

### Error Responses

**400 Bad Request** (validation error):
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid update",
    "details": {
      "expected_hours": "Expected hours (8.5) must match calculated hours from windows (8.0) within ±0.01"
    }
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Shift type not found"
  }
}
```

**409 Conflict** (new name already exists):
```json
{
  "error": {
    "code": "DUPLICATE_NAME",
    "message": "Shift type name 'Cortado Premium' already exists"
  }
}
```

---

## DELETE /shift-types/{id}

### Purpose
Soft-delete a shift type (sets is_active=false). Prevents deletion if teams are assigned.

### Request

**Method**: DELETE
**Path**: `/shift-types/{id}`

**Headers**:
- `Authorization: Bearer <access_token>`

**Example**:
```bash
DELETE /shift-types/550e8400-e29b-41d4-a716-446655440003
Authorization: Bearer eyJhbGc...
```

### Response

**Status Code**: `204 No Content` (successful deletion)

**Body**: (empty)

### Error Responses

**400 Bad Request** (teams assigned):
```json
{
  "error": {
    "code": "SHIFT_TYPE_IN_USE",
    "message": "Cannot delete shift type 'Cortado' — currently assigned to 3 teams",
    "details": {
      "teams_count": 3,
      "team_names": ["Cocina Cortado A", "Cocina Cortado B", "Barra Cortado"],
      "action": "Remove teams from this shift type before deletion, or re-assign to another shift type"
    }
  }
}
```

**404 Not Found**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Shift type not found"
  }
}
```

**403 Forbidden** (insufficient role — only Admin):
```json
{
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Only Admin can delete shift types"
  }
}
```

---

## Status Codes Summary

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | GET successful, PUT successful |
| 201 | Created | POST successful |
| 204 | No Content | DELETE successful |
| 400 | Bad Request | Validation errors, invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient role |
| 404 | Not Found | Shift type doesn't exist |
| 409 | Conflict | Duplicate name, shift in use on delete |

---

## Common Patterns

### Tenant Isolation
All shift types automatically scoped to tenant from JWT. Request cannot specify tenant_id.

### Role-Based Access
- `Admin`: Full access (GET, POST, PUT, DELETE)
- `Moderador`: Read-write access (GET, POST, PUT), no DELETE
- `Empleado`: No access (403 Forbidden)

### Pagination
- Default page size: 20
- Max page size: 100
- Pages 1-indexed

### Error Format
All errors follow standard format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { /* optional context */ }
  }
}
```

---

## Contract Status

✅ **APPROVED** — Ready for implementation

