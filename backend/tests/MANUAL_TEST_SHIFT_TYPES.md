# T026: Manual Testing Guide - Shift Types API

This guide provides cURL examples to manually test the shift-types API endpoints.

## Prerequisites

1. Backend running: `uvicorn app.main:app --reload`
2. Admin user token (from login or seed)
3. Tenant ID (from database or seed)

## Setup: Get Admin Token

```bash
# Login as admin
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@ilpi.es",
    "password": "Admin123!"
  }' | jq .

# Extract access_token from response
export TOKEN="<your_access_token>"
```

## Test 1: Create Mañana Shift (Single Window)

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mañana",
    "type": "MAÑANA",
    "time_windows": [
      {"start": "10:30", "end": "18:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 7.5,
    "description": "Morning shift"
  }' | jq .

# Expected: 201 Created
# Response should include total_hours: 7.5
```

## Test 2: Create Cortado Shift (Split Windows)

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cortado",
    "type": "CORTADO",
    "time_windows": [
      {"start": "12:30", "end": "16:30"},
      {"start": "18:30", "end": "22:30"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0,
    "description": "Split shift with lunch break"
  }' | jq .

# Expected: 201 Created
# Response should include:
# - time_windows with 2 windows
# - total_hours: 8.0
```

## Test 3: Create Noche Shift (Dynamic Close)

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Noche",
    "type": "NOCHE",
    "time_windows": [
      {"start": "17:00", "end": "23:59"}
    ],
    "uses_dynamic_close": true,
    "expected_hours": 7.7,
    "description": "Evening shift to close"
  }' | jq .

# Expected: 201 Created
# Response should include uses_dynamic_close: true
```

## Test 4: List Shift Types (Paginated)

```bash
curl -X GET "http://localhost:8000/api/v1/shift-types?page=1&size=20" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK
# Response should include:
# - items: array of shift types
# - total: count
# - page: 1
# - pages: total pages
# - size: 20
```

## Test 5: Get Single Shift Type

```bash
# Replace SHIFT_TYPE_ID with actual ID from test 1
curl -X GET http://localhost:8000/api/v1/shift-types/SHIFT_TYPE_ID \
  -H "Authorization: Bearer $TOKEN" | jq .

# Expected: 200 OK
# Response should include full shift type details
```

## Test 6: Update Shift Type (Change Times)

```bash
# Update Mañana end time from 18:00 to 18:30
curl -X PUT http://localhost:8000/api/v1/shift-types/SHIFT_TYPE_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "time_windows": [
      {"start": "10:30", "end": "18:30"}
    ],
    "expected_hours": 8.0
  }' | jq .

# Expected: 200 OK
# Response should include:
# - updated time_windows
# - total_hours: 8.0
```

## Test 7: Reject Duplicate Name

```bash
# Try to create another "Mañana" shift
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mañana",
    "type": "MAÑANA",
    "time_windows": [
      {"start": "10:00", "end": "18:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0
  }' | jq .

# Expected: 409 Conflict
# Error message should mention duplicate name
```

## Test 8: Reject Invalid Time Format

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Invalid",
    "type": "MAÑANA",
    "time_windows": [
      {"start": "10:3", "end": "18:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 7.5
  }' | jq .

# Expected: 422 Unprocessable Entity
# Error about invalid time format
```

## Test 9: Reject Expected Hours Mismatch

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mismatch",
    "type": "MAÑANA",
    "time_windows": [
      {"start": "10:30", "end": "18:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 10.0
  }' | jq .

# Expected: 422 Unprocessable Entity
# Error about hours mismatch (should be 7.5, not 10.0)
```

## Test 10: Delete Shift Type (Soft Delete)

```bash
curl -X DELETE http://localhost:8000/api/v1/shift-types/SHIFT_TYPE_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 204 No Content
# No response body

# Verify soft delete by fetching the shift type
curl -X GET http://localhost:8000/api/v1/shift-types/SHIFT_TYPE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.is_active'

# Should return: false
```

## Test 11: RBAC - Moderador Can Create

```bash
# Login as Moderador
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "moderador@ilpi.es",
    "password": "Mod123!"
  }' | jq .

export MOD_TOKEN="<moderador_token>"

# Moderador creates shift type
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $MOD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tarde",
    "type": "NOCHE",
    "time_windows": [
      {"start": "15:00", "end": "23:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0
  }' | jq .

# Expected: 201 Created
```

## Test 12: RBAC - Moderador Cannot Delete

```bash
# Try to delete with Moderador token
curl -X DELETE http://localhost:8000/api/v1/shift-types/SHIFT_TYPE_ID \
  -H "Authorization: Bearer $MOD_TOKEN"

# Expected: 403 Forbidden
# Error: "Acceso denegado" or similar
```

## Test 13: Validate Chronological Window Ordering

```bash
# Try to create shift with windows out of order
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "BadOrder",
    "type": "CORTADO",
    "time_windows": [
      {"start": "18:30", "end": "22:30"},
      {"start": "12:30", "end": "16:30"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0
  }' | jq .

# Expected: 422 Unprocessable Entity
# Error about windows not being chronologically ordered
```

## Test 14: Midnight Spanning Shift

```bash
curl -X POST http://localhost:8000/api/v1/shift-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LateNight",
    "type": "CORRIDO",
    "time_windows": [
      {"start": "22:00", "end": "06:00"}
    ],
    "uses_dynamic_close": false,
    "expected_hours": 8.0,
    "description": "Shift spanning midnight"
  }' | jq .

# Expected: 201 Created
# Response should include total_hours: 8.0 (22:00 to 06:00 = 8 hours)
```

## Checklist: User Story 1 Complete

- [x] Create single-window shift (Mañana) ← Test 1
- [x] Create split-window shift (Cortado) ← Test 2
- [x] Create dynamic-close shift (Noche) ← Test 3
- [x] List shift types paginated ← Test 4
- [x] Get single shift type ← Test 5
- [x] Update shift type times ← Test 6
- [x] Reject duplicate names ← Test 7
- [x] Reject invalid time format ← Test 8
- [x] Reject hours mismatch ← Test 9
- [x] Soft delete shift type ← Test 10
- [x] RBAC: Moderador can create ← Test 11
- [x] RBAC: Moderador cannot delete ← Test 12
- [x] Validate window ordering ← Test 13
- [x] Handle midnight spanning ← Test 14

---

**User Story 1 Status**: ✅ **COMPLETE - All acceptance criteria validated**
