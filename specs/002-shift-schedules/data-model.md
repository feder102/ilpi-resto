# Data Model: Shift Schedule Configuration & Auto Calculation

**Feature**: `002-shift-schedules` | **Date**: 2026-02-28 | **Status**: Phase 1

---

## Entity Diagrams

```
┌─────────────────────┐
│     ShiftType       │
├─────────────────────┤
│ id (PK)             │
│ tenant_id (FK)      │
│ name                │
│ type (enum)         │
│ time_windows (JSON) │
│ uses_dynamic_close  │
│ expected_hours      │
│ description         │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
        ▲
        │ 1
        │
    many│
        │
┌─────────────────────┐
│       Team          │
├─────────────────────┤
│ id (PK)             │
│ tenant_id (FK)      │
│ name                │
│ department          │
│ shift_type_id (FK)  │ ◄── NEW
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘
```

---

## ShiftType Entity

### Definition

Represents a predefined organizational shift configuration (Mañana, Noche, Cortado, Corrido). Admins define shift types once, teams reference them.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `tenant_id` | UUID | FOREIGN KEY → tenant | Multi-tenant isolation |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE(tenant_id, name) | Shift type name (e.g., "Cortado") |
| `type` | ENUM | NOT NULL | Standard type: MAÑANA, NOCHE, CORTADO, CORRIDO |
| `time_windows` | JSON | NOT NULL | Array of {start, end} time windows (HH:MM format) |
| `uses_dynamic_close` | BOOLEAN | NOT NULL, DEFAULT false | True if shift ends at variable "Cierre" time |
| `expected_hours` | DECIMAL(5,2) | NOT NULL, CHECK > 0 | Standard hours for this shift (e.g., 7.5, 8.0) |
| `description` | VARCHAR(500) | NULL | Optional notes (e.g., "Morning shift with early start") |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft delete flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Creation timestamp (UTC) |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Last update timestamp (UTC) |

### Validation Rules

1. **name**:
   - Required, 1-100 characters
   - Unique per tenant (no duplicate names within same tenant)
   - Allowed characters: alphanumeric, spaces, hyphens, underscores, accented chars (for Spanish)

2. **type**:
   - Must be one of: MAÑANA, NOCHE, CORTADO, CORRIDO
   - Enum-based validation

3. **time_windows**:
   - Required, non-empty array
   - Minimum 1 window, maximum 3 windows (Cortado = 2, others = 1)
   - Each window: {start: "HH:MM", end: "HH:MM"}
     - Format: 24-hour time (00:00 to 23:59)
     - Start and end both required
     - End must be > start (same-day or next-day via 24h logic)
   - Windows must be chronologically ordered (earliest first)
   - Windows must not overlap (e.g., can't have 10:00-14:00 and 12:00-16:00)

4. **uses_dynamic_close**:
   - Boolean flag
   - True for Noche and Corrido (shifts ending at variable "Cierre")
   - False for Mañana and Cortado (fixed time windows)

5. **expected_hours**:
   - Required, positive decimal
   - Range: 0.5 to 24.0 (half-hour to full day)
   - Must match calculated total_hours within 0.01 tolerance (sanity check)
   - For dynamic close shifts (Noche, Corrido): admin-provided estimate (e.g., 7.7, 10.0)
   - For fixed shifts: calculated from time_windows with 0.01 tolerance verification

6. **description**:
   - Optional, 0-500 characters
   - Used for admin reference (e.g., "Spanish labor regulation: minimum 6.5 hrs/shift")

7. **is_active**:
   - Default true
   - Set to false on soft delete
   - Active shift types listed by default in API
   - Inactive shift types hidden from UI, but existing teams can still reference them

### Derived Properties (Calculated, Not Stored)

| Property | Calculation | Purpose |
|----------|-------------|---------|
| `total_hours` | SUM(duration of all time_windows) | Display to admins/teams for verification |

**Calculation logic**:
```python
def calculate_total_hours(time_windows: list[dict]) -> float:
    """
    Calculate total hours from time windows, handling midnight spans.

    Args:
        time_windows: [{"start": "HH:MM", "end": "HH:MM"}, ...]

    Returns:
        float: Total hours (e.g., 8.0, 7.5)
    """
    total_minutes = 0
    for window in time_windows:
        start = datetime.strptime(window['start'], '%H:%M').time()
        end = datetime.strptime(window['end'], '%H:%M').time()

        # If end < start, spans midnight (e.g., 23:00 to 06:00)
        if end < start:
            minutes = (24 * 60) - (start.hour * 60 + start.minute) + (end.hour * 60 + end.minute)
        else:
            minutes = (end.hour * 60 + end.minute) - (start.hour * 60 + start.minute)

        total_minutes += minutes

    return round(total_minutes / 60, 2)
```

### State Transitions

| State | Transition | New State | Trigger |
|-------|-----------|-----------|---------|
| is_active=true | Delete by admin | is_active=false | DELETE /shift-types/{id} |
| is_active=false | Cannot re-activate in MVP | — | (Future feature) |
| — | Create | is_active=true | POST /shift-types |
| is_active=true | Update fields | is_active=true | PUT /shift-types/{id} |

### Database Constraints

```sql
CREATE TABLE shift_type (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('MAÑANA', 'NOCHE', 'CORTADO', 'CORRIDO')),
    time_windows JSONB NOT NULL,
    uses_dynamic_close BOOLEAN NOT NULL DEFAULT false,
    expected_hours DECIMAL(5,2) NOT NULL CHECK (expected_hours > 0),
    description VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, name),
    CHECK (expected_hours >= 0.5 AND expected_hours <= 24.0)
);

CREATE INDEX idx_shift_type_tenant_active ON shift_type(tenant_id, is_active);
CREATE INDEX idx_shift_type_tenant_name ON shift_type(tenant_id, name);
```

---

## Team Entity Modifications

### Changes to Existing Team Model

**Removed Fields**:
- `shift_start` (time) → Replaced by shift_type_id reference
- `shift_end` (time) → Replaced by shift_type_id reference

**Added Fields**:
- `shift_type_id` (UUID FK) → References ShiftType(id)

**New Derived Property**:
- `total_hours` (decimal, read-only) → Calculated from shift_type.expected_hours

### Updated Definition

| Field | Type | Changes | Notes |
|-------|------|---------|-------|
| `id` | UUID | — | Unchanged |
| `tenant_id` | UUID | — | Unchanged |
| `name` | VARCHAR(100) | — | Unchanged |
| `department` | VARCHAR(50) | — | Unchanged |
| `shift_type_id` | UUID | **NEW** | FK → ShiftType(id), NOT NULL |
| `shift_start` | TIME | **REMOVED** | Data migrated to ShiftType.time_windows |
| `shift_end` | TIME | **REMOVED** | Data migrated to ShiftType.time_windows |
| `is_active` | BOOLEAN | — | Unchanged |
| `created_at` | TIMESTAMP | — | Unchanged |
| `updated_at` | TIMESTAMP | — | Unchanged |

### Derived Property: total_hours

```python
@property
def total_hours(self) -> float:
    """
    Calculate total hours from referenced ShiftType.

    Returns:
        float: Expected hours for this team's shift type
    """
    if not self.shift_type:
        return 0.0
    return self.shift_type.expected_hours  # or calculated from time_windows
```

### Updated Constraints

```sql
ALTER TABLE team
    ADD COLUMN shift_type_id UUID NOT NULL REFERENCES shift_type(id) ON DELETE RESTRICT,
    DROP COLUMN shift_start,
    DROP COLUMN shift_end;

CREATE INDEX idx_team_shift_type ON team(shift_type_id);
```

**ON DELETE RESTRICT**: Prevents shift type deletion if teams reference it (enforced at service layer for better UX).

### Validation Rule Updates

1. **shift_type_id**:
   - Required (NOT NULL)
   - Must reference active shift type (is_active=true)
   - Must belong to same tenant as team

2. **Data Migration**:
   - Existing teams with shift_start/shift_end must be migrated
   - Migration strategy: Create default ShiftType per existing shift_start/shift_end pair, then assign to teams
   - See alembic migration for details

---

## Relationships

### ShiftType ↔ Team (1:N)

- **One** ShiftType can be assigned to **many** Teams
- **One** Team references **one** ShiftType
- **Cardinality**: ShiftType (1) ← Team (N)
- **Referential Integrity**: RESTRICT on delete (prevent deletion of in-use shift types)

**Queries**:
```sql
-- List all teams using a shift type
SELECT * FROM team WHERE shift_type_id = ? AND tenant_id = ?;

-- Check if shift type is in use
SELECT COUNT(*) FROM team WHERE shift_type_id = ? AND is_active = true;

-- Get all shift details for a team
SELECT t.*, st.*
FROM team t
JOIN shift_type st ON t.shift_type_id = st.id
WHERE t.id = ?;
```

---

## Data Migration Strategy

### Alembic Migration Approach

**Phase 1: Add ShiftType table**
- Create `shift_type` table with all fields
- Create default shift types for existing shift_start/shift_end combinations

**Phase 2: Add shift_type_id to Team**
- Add `shift_type_id` column (nullable initially)
- Populate `shift_type_id` based on existing shift_start/shift_end values
- Add NOT NULL constraint

**Phase 3: Drop old columns**
- Remove `shift_start` and `shift_end` from `team` table
- Clean up any temporary tables

**Seed Data**:
```python
# backend/app/seed.py additions
def seed_default_shift_types(session, tenant):
    """Create standard shift types for new tenant."""
    shift_types = [
        ShiftType(
            tenant_id=tenant.id,
            name="Mañana",
            type="MAÑANA",
            time_windows=[{"start": "10:30", "end": "18:00"}],
            uses_dynamic_close=False,
            expected_hours=7.5,
            description="Morning shift"
        ),
        ShiftType(
            tenant_id=tenant.id,
            name="Noche",
            type="NOCHE",
            time_windows=[{"start": "17:00", "end": "23:59"}],  # Placeholder for Cierre
            uses_dynamic_close=True,
            expected_hours=7.7,
            description="Evening/night shift to kitchen close"
        ),
        ShiftType(
            tenant_id=tenant.id,
            name="Cortado",
            type="CORTADO",
            time_windows=[
                {"start": "12:30", "end": "16:30"},
                {"start": "18:30", "end": "22:30"}
            ],
            uses_dynamic_close=False,
            expected_hours=8.0,
            description="Split shift with lunch break"
        ),
        ShiftType(
            tenant_id=tenant.id,
            name="Corrido",
            type="CORRIDO",
            time_windows=[{"start": "14:00", "end": "23:59"}],  # Placeholder for Cierre
            uses_dynamic_close=True,
            expected_hours=10.0,
            description="Continuous shift to kitchen close"
        ),
    ]

    for shift_type in shift_types:
        session.add(shift_type)

    session.commit()
```

---

## Indexes

### Performance Optimization

```sql
-- Shift Type Indexes
CREATE INDEX idx_shift_type_tenant_active ON shift_type(tenant_id, is_active);
CREATE INDEX idx_shift_type_tenant_name ON shift_type(tenant_id, name);

-- Team Indexes
CREATE INDEX idx_team_shift_type ON team(shift_type_id);
CREATE INDEX idx_team_tenant_active ON team(tenant_id, is_active);
```

**Rationale**:
- `idx_shift_type_tenant_active`: List active shift types (common query in API)
- `idx_shift_type_tenant_name`: Lookup by name (validation, uniqueness check)
- `idx_team_shift_type`: Query teams by shift type (deletion safety check)
- `idx_team_tenant_active`: Existing query optimization

---

## Enum Definition

### ShiftTypeEnum (Python)

```python
from enum import Enum

class ShiftTypeEnum(str, Enum):
    """Standard shift type categories."""
    MAÑANA = "MAÑANA"      # Morning shift (10:30-18:00)
    NOCHE = "NOCHE"        # Evening/night shift to close (17:00-Cierre)
    CORTADO = "CORTADO"    # Split shift with break (12:30-16:30, 18:30-22:30)
    CORRIDO = "CORRIDO"    # Continuous shift to close (14:00-Cierre)
```

Used for:
- ShiftType.type field validation
- API request/response validation
- Team.shift_type assignment

---

## Summary

| Entity | New/Modified | Key Features |
|--------|---|---|
| **ShiftType** | NEW | Admin-configured shift definitions, supports split shifts & dynamic close times, calculated total_hours |
| **Team** | MODIFIED | References ShiftType via shift_type_id, removed shift_start/shift_end, calculated total_hours property |

**Migration Impact**: One Alembic migration (3 phases), seed data initialization, existing team data re-mapped.

**Status**: ✅ **PHASE 1 COMPLETE** — Ready for API contract specifications (contracts/)

