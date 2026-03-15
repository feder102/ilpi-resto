# Data Model: Automatic Shift-Based Time Tracking

**Feature**: 008-automatic-time-tracking
**Version**: 1.0
**Date**: 2026-03-13

---

## Entity Diagram

```
Employee
  ├─ id (PK)
  ├─ tenant_id (FK)
  └─ status (enum: Activo, Inactivo)
        ↓ (has many)
        ShiftRecord
          ├─ id (PK)
          ├─ tenant_id (FK)
          ├─ employee_id (FK)
          ├─ shift_date (date)
          ├─ shift_type_id (FK)
          └─ status (enum)
              ↓ (triggers)
              TimeEntry (NEW)
                ├─ id (PK)
                ├─ tenant_id (FK)
                ├─ employee_id (FK)
                ├─ shift_date (date)
                ├─ start_time (time)
                ├─ end_time (time)
                ├─ hours_worked (decimal)
                ├─ source (enum: shift, manual) ← Future manual tracking support
                └─ created_at (timestamp)

ShiftType
  ├─ id (PK)
  ├─ tenant_id (FK)
  ├─ name (string, e.g., "Mañana", "Noche")
  ├─ start_time (time)
  └─ end_time (time)
```

---

## New Entity: TimeEntry

### Purpose
Auto-generated records of employee work hours based on assigned shifts. Designed for automatic tracking in Phase 1 with future support for manual tracking via `source` field.

### SQLModel Definition

```python
from typing import Optional
from datetime import datetime, date, time
from decimal import Decimal
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Enum as SQLEnum

class TimeEntrySource(str, Enum):
    SHIFT = "shift"      # Auto-generated from shift assignment
    MANUAL = "manual"    # Manually clocked in/out (future phase)

class TimeEntry(SQLModel, table=True):
    __tablename__ = "time_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    tenant_id: int = Field(foreign_key="tenant.id", index=True)
    employee_id: int = Field(foreign_key="employee.id", index=True)

    shift_date: date = Field(index=True)      # Date of the shift/work
    start_time: time                           # Shift start time (e.g., 22:00)
    end_time: time                             # Shift end time (e.g., 06:00)
    hours_worked: Decimal = Field(decimal_places=2, max_digits=5)  # Calculated: (end - start)

    source: TimeEntrySource = Field(
        sa_column=SQLEnum(TimeEntrySource, native_enum=False),
        default=TimeEntrySource.SHIFT
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Foreign keys (optional for relationships)
    shift_record_id: Optional[int] = Field(foreign_key="shift_record.id", nullable=True)
    shift_type_id: Optional[int] = Field(foreign_key="shift_type.id", nullable=True)

    # Relationships
    employee: Optional["Employee"] = Relationship(back_populates="time_entries")
    shift_record: Optional["ShiftRecord"] = Relationship(back_populates="time_entry")
    shift_type: Optional["ShiftType"] = Relationship()

    # Constraints
    __table_args__ = (
        UniqueConstraint("tenant_id", "employee_id", "shift_date", "shift_type_id",
                        name="uq_time_entry_employee_date_shift"),
    )
```

### Fields Explanation

| Field | Type | Nullable | Constraints | Purpose |
|-------|------|----------|-------------|---------|
| `id` | Integer | No | PK | Primary key |
| `tenant_id` | Integer | No | FK(tenant), Index | Multi-tenant isolation |
| `employee_id` | Integer | No | FK(employee), Index | Link to employee who worked |
| `shift_date` | Date | No | Index | Date of the shift |
| `start_time` | Time | No | — | Shift start (e.g., 22:00) |
| `end_time` | Time | No | — | Shift end (e.g., 06:00 next day) |
| `hours_worked` | Decimal(5,2) | No | — | Duration: calculated from start/end |
| `source` | Enum | No | Default: SHIFT | shift=auto, manual=future phase |
| `created_at` | DateTime | No | Default: UTC now | Record creation timestamp |
| `updated_at` | DateTime | No | Default: UTC now | Last update timestamp |
| `shift_record_id` | Integer | Yes | FK(shift_record) | Reference to triggering ShiftRecord |
| `shift_type_id` | Integer | Yes | FK(shift_type) | Reference to shift template |

### Validation Rules

- **hours_worked**: Calculated as `(end_time - start_time) hours`. For overnight shifts (e.g., 22:00-06:00), calculate as `24 - (start_time - end_time)` or store as decimal
- **Idempotency**: Unique constraint prevents duplicate (tenant_id, employee_id, shift_date, shift_type_id)
- **Tenant Isolation**: All queries filter by `tenant_id` (required)
- **Created/Updated**: Timestamps automatically managed; updated_at updated on any change
- **Source Tracking**: Future-proofing for manual entries; currently only shift entries created

---

## Modified Entities

### Employee (Existing)
**Changes**: Add relationship to TimeEntry (reverse relation)
```python
# In Employee model
time_entries: Optional[List["TimeEntry"]] = Relationship(back_populates="employee")
```

### ShiftRecord (Existing)
**Changes**: Add relationship to TimeEntry (one ShiftRecord → one TimeEntry)
```python
# In ShiftRecord model
time_entry: Optional["TimeEntry"] = Relationship(back_populates="shift_record")
```

---

## Alembic Migration

**Migration Name**: `create_time_entry_table`
**Version**: Auto-generated by `alembic revision --autogenerate`

**Manual Steps**:
1. Define TimeEntry model as above
2. Run: `alembic revision --autogenerate -m "Create time_entry table"`
3. Review generated migration in `alembic/versions/`
4. Apply: `alembic upgrade head`

**Key Indexes**:
- `(tenant_id, employee_id, shift_date)` — for filtering by employee/period
- `(tenant_id, shift_date)` — for batch processing
- `(employee_id, source)` — for future manual vs. auto tracking distinction

---

## Queries & Aggregations

### Automatic Entry Creation
```python
# Pseudo-code: Create TimeEntry from ShiftRecord
for shift_record in ShiftRecord.filter(tenant_id=tenant, shift_date=today):
    hours = calculate_hours(shift_record.shift_type.start_time,
                           shift_record.shift_type.end_time)
    entry, created = TimeEntry.get_or_create(
        tenant_id=tenant,
        employee_id=shift_record.employee_id,
        shift_date=shift_record.shift_date,
        shift_type_id=shift_record.shift_type_id,
        defaults={
            'start_time': shift_record.shift_type.start_time,
            'end_time': shift_record.shift_type.end_time,
            'hours_worked': hours,
            'source': TimeEntrySource.SHIFT
        }
    )
```

### Employee Statistics (Monthly)
```python
# Total hours for an employee in a month
SELECT
    SUM(hours_worked) as total_hours,
    COUNT(DISTINCT shift_date) as days_worked,
    AVG(hours_worked) as avg_hours_per_day
FROM time_entries
WHERE tenant_id = ?
  AND employee_id = ?
  AND EXTRACT(YEAR FROM shift_date) = 2026
  AND EXTRACT(MONTH FROM shift_date) = 3
  AND source = 'shift'
```

### Department Statistics (Monthly)
```python
# Hours by department
SELECT
    e.department,
    SUM(te.hours_worked) as total_hours,
    COUNT(DISTINCT te.employee_id) as employee_count,
    AVG(te.hours_worked) as avg_hours
FROM time_entries te
JOIN employee e ON te.employee_id = e.id
WHERE te.tenant_id = ?
  AND te.shift_date BETWEEN ? AND ?
  AND te.source = 'shift'
GROUP BY e.department
```

---

## State Transitions

**TimeEntry Lifecycle** (Automatic Tracking):

```
[ShiftRecord Created]
    ↓
[Batch Job Runs]
    ↓
[Check: TimeEntry exists for this shift_date?]
    ↓
    ├─ YES → Skip (idempotent)
    └─ NO → Create TimeEntry (source=SHIFT)
    ↓
[TimeEntry active until...]
    ├─ Manual edit (Phase 2)
    ├─ Soft delete if shift cancelled
    └─ Remains for audit/statistics
```

---

## Constraints & Assumptions

- **No Overnight Edge Case**: If shift ends after midnight (22:00-06:00), store end_time as 06:00 (next calendar day) or use duration field
- **Timezone**: All times stored in tenant timezone; DB uses UTC after conversion
- **Soft Delete**: TimeEntry records NOT soft-deleted; deletion of ShiftRecord doesn't cascade-delete TimeEntry (audit trail)
- **Immutability**: TimeEntry records created by system are immutable in Phase 1 (no updates); Phase 2 allows corrections via separate audit log
- **Future Manual Tracking**: TimeEntry table reused for manual entries with `source='manual'`; no duplicate entries allowed for same employee/date

---

## Out of Scope (Phase 2+)

- Manual clock in/out time entries
- Corrections/amendments to automatic entries
- Overtime calculations
- Wage calculations based on time entries
- Shift swap conflict detection with time entries
