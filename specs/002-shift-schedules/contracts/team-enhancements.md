# API Contract: Team Endpoints Enhanced

**Feature**: `002-shift-schedules` | **Date**: 2026-02-28 | **Scope**: Team CRUD modifications to use ShiftType

---

## Overview

Team endpoints are enhanced to reference predefined **ShiftType** instead of storing raw shift times.

**Changes**:
- Remove `shift_start` and `shift_end` fields
- Add `shift_type_id` (UUID FK) or `shift_type` (enum string) field
- Add derived `total_hours` field to all responses
- Update validation to reference ShiftType

---

## POST /teams

### Purpose
Create a new team and assign to shift type.

### Request

**Method**: POST
**Path**: `/teams`

**Headers**:
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Body** (Updated schema):
```json
{
  "name": "Cocina Cortado A",
  "department": "Cocina",
  "shift_type": "CORTADO",
  "members": ["550e8400-e29b-41d4-a716-446655440010", "550e8400-e29b-41d4-a716-446655440011"]
}
```

**Field Changes**:

| Field | Old | New | Notes |
|-------|-----|-----|-------|
| `name` | string | string | Unchanged |
| `department` | string | string | Unchanged |
| `shift_start` | time HH:MM | **REMOVED** | — |
| `shift_end` | time HH:MM | **REMOVED** | — |
| `shift_type` | — | **NEW** | String enum: MAÑANA, NOCHE, CORTADO, CORRIDO |
| `members` | [uuid] | [uuid] | Unchanged |

### Response

**Status Code**: `201 Created`

**Body** (Enhanced):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cocina Cortado A",
  "department": "Cocina",
  "shift_type": "CORTADO",
  "shift_type_id": "550e8400-e29b-41d4-a716-446655440003",
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
  "total_hours": 8.0,
  "expected_hours": 8.0,
  "uses_dynamic_close": false,
  "is_active": true,
  "members": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "first_name": "Juan",
      "last_name": "García",
      "profile_image": null
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440011",
      "first_name": "María",
      "last_name": "López",
      "profile_image": null
    }
  ],
  "created_at": "2026-02-28T14:30:00Z",
  "updated_at": "2026-02-28T14:30:00Z"
}
```

**New Response Fields**:
- `shift_type`: String enum value (CORTADO, etc)
- `shift_type_id`: UUID reference
- `time_windows`: Full time window details from ShiftType
- `total_hours`: Calculated from time_windows (or expected_hours for dynamic close)
- `expected_hours`: From ShiftType
- `uses_dynamic_close`: From ShiftType

### Error Responses

**400 Bad Request** (invalid shift type):
```json
{
  "error": {
    "code": "INVALID_SHIFT_TYPE",
    "message": "Invalid shift_type: 'Almuerzo'. Valid options: MAÑANA, NOCHE, CORTADO, CORRIDO"
  }
}
```

**422 Unprocessable Entity** (shift type doesn't exist):
```json
{
  "error": {
    "code": "SHIFT_TYPE_NOT_FOUND",
    "message": "Shift type 'CORTADO' is not configured for this tenant. Contact admin to configure shift types.",
    "details": {
      "available_shift_types": ["MAÑANA", "NOCHE"]
    }
  }
}
```

---

## GET /teams

### Purpose
List all teams, now including shift type details.

### Request

**Method**: GET
**Path**: `/teams`

**Query Parameters** (unchanged):
- `page` (integer, default 1)
- `size` (integer, default 20, max 100)
- `department` (string, optional filter)

### Response

**Status Code**: `200 OK`

**Body** (Enhanced with shift_type details):
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440100",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Cocina Cortado A",
      "department": "Cocina",
      "shift_type": "CORTADO",
      "shift_type_id": "550e8400-e29b-41d4-a716-446655440003",
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
      "total_hours": 8.0,
      "expected_hours": 8.0,
      "uses_dynamic_close": false,
      "is_active": true,
      "members": [
        {
          "id": "550e8400-e29b-41d4-a716-446655440010",
          "first_name": "Juan",
          "last_name": "García",
          "profile_image": null
        }
      ],
      "created_at": "2026-02-28T14:30:00Z",
      "updated_at": "2026-02-28T14:30:00Z"
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440101",
      "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Cocina Mañana",
      "department": "Cocina",
      "shift_type": "MAÑANA",
      "shift_type_id": "550e8400-e29b-41d4-a716-446655440000",
      "time_windows": [
        {
          "start": "10:30",
          "end": "18:00"
        }
      ],
      "total_hours": 7.5,
      "expected_hours": 7.5,
      "uses_dynamic_close": false,
      "is_active": true,
      "members": [],
      "created_at": "2026-02-28T10:00:00Z",
      "updated_at": "2026-02-28T10:00:00Z"
    }
  ],
  "page": 1,
  "size": 20,
  "total": 2,
  "pages": 1
}
```

---

## GET /teams/{id}

### Purpose
Get full details of a team with complete shift type information.

### Response

**Status Code**: `200 OK`

**Body** (Enhanced):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cocina Cortado A",
  "department": "Cocina",
  "shift_type": "CORTADO",
  "shift_type_id": "550e8400-e29b-41d4-a716-446655440003",
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
  "total_hours": 8.0,
  "expected_hours": 8.0,
  "uses_dynamic_close": false,
  "is_active": true,
  "members": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "first_name": "Juan",
      "last_name": "García",
      "profile_image": null
    }
  ],
  "created_at": "2026-02-28T14:30:00Z",
  "updated_at": "2026-02-28T14:30:00Z"
}
```

---

## PUT /teams/{id}

### Purpose
Update team configuration, including changing shift type.

### Request

**Method**: PUT
**Path**: `/teams/{id}`

**Body** (partial update):
```json
{
  "name": "Cocina Cortado B",
  "shift_type": "MAÑANA"
}
```

### Response

**Status Code**: `200 OK`

**Body** (full updated team):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440100",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Cocina Cortado B",
  "department": "Cocina",
  "shift_type": "MAÑANA",
  "shift_type_id": "550e8400-e29b-41d4-a716-446655440000",
  "time_windows": [
    {
      "start": "10:30",
      "end": "18:00"
    }
  ],
  "total_hours": 7.5,
  "expected_hours": 7.5,
  "uses_dynamic_close": false,
  "is_active": true,
  "members": [],
  "created_at": "2026-02-28T14:30:00Z",
  "updated_at": "2026-02-28T15:00:00Z"
}
```

### Error Responses

**400 Bad Request** (invalid shift type):
```json
{
  "error": {
    "code": "INVALID_SHIFT_TYPE",
    "message": "Invalid shift_type: 'Almuerzo'. Valid options: MAÑANA, NOCHE, CORTADO, CORRIDO"
  }
}
```

**422 Unprocessable Entity** (shift type not configured):
```json
{
  "error": {
    "code": "SHIFT_TYPE_NOT_FOUND",
    "message": "Shift type 'MAÑANA' is not configured for this tenant"
  }
}
```

---

## DELETE /teams/{id}

### Purpose
Delete a team (or soft-delete if keeping history).

### Response

**Status Code**: `204 No Content`

**Note**: Deletion behavior unchanged; still respects existing team deletion rules.

---

## Backward Compatibility

### For Existing Teams

**Data Migration**:
1. Existing teams have `shift_start` and `shift_end` stored as time values
2. Alembic migration creates matching ShiftType entries based on unique (shift_start, shift_end) combinations
3. Migration assigns `shift_type_id` to each team
4. Old columns are dropped

**Example Migration**:
```
Teams with shift_start=10:30, shift_end=18:00
  ↓
Creates ShiftType "Mañana" with time_windows=[{start: "10:30", end: "18:00"}]
  ↓
Assigns all matching teams to new ShiftType "Mañana"
```

### Legacy Field Removal

**Before** (old schema):
```json
{
  "shift_start": "10:30",
  "shift_end": "18:00"
}
```

**After** (new schema):
```json
{
  "shift_type": "MAÑANA",
  "shift_type_id": "uuid",
  "time_windows": [{"start": "10:30", "end": "18:00"}],
  "total_hours": 7.5
}
```

---

## Response Field Summary

### Team Response Fields (All endpoints)

| Field | Type | Source | Notes |
|-------|------|--------|-------|
| `id` | UUID | Team | Unchanged |
| `tenant_id` | UUID | Team | Unchanged |
| `name` | string | Team | Unchanged |
| `department` | string | Team | Unchanged |
| `shift_type` | enum | Team.shift_type_id → ShiftType | NEW: Enum string (MAÑANA, NOCHE, etc) |
| `shift_type_id` | UUID | Team | NEW: FK reference |
| `time_windows` | array | ShiftType | NEW: [{start, end}, ...] |
| `total_hours` | decimal | ShiftType | NEW: Calculated from time_windows |
| `expected_hours` | decimal | ShiftType | NEW: For dynamic close shifts |
| `uses_dynamic_close` | boolean | ShiftType | NEW: Indicates dynamic close shift |
| `members` | array | Team → Employee | Unchanged |
| `is_active` | boolean | Team | Unchanged |
| `created_at` | timestamp | Team | Unchanged |
| `updated_at` | timestamp | Team | Unchanged |

---

## Contract Status

✅ **APPROVED** — Ready for implementation

